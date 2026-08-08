import asyncio
import re
import sys
import subprocess
import socket
from typing import List, Dict, Optional

def check_ip_online_sync(ip: str, is_windows: bool) -> bool:
    if is_windows:
        cmd = ["ping", "-n", "1", "-w", "500", ip]
    else:
        cmd = ["ping", "-c", "1", "-W", "1", ip]
    try:
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=0.8)
        return res.returncode == 0
    except Exception:
        return False

async def ping_ip(ip: str, semaphore: asyncio.Semaphore) -> Optional[Dict[str, str]]:
    """
    Pings a single IP using the system's native ping command.
    """
    async with semaphore:
        is_windows = sys.platform.lower().startswith("win")
        online = await asyncio.to_thread(check_ip_online_sync, ip, is_windows)
        if online:
            return {"ip": ip, "online": True}
        return None

def get_mac_from_arp(ip: str) -> Optional[str]:
    """
    Checks the local OS ARP cache to resolve the MAC address for an IP.
    """
    try:
        is_windows = sys.platform.lower().startswith("win")
        if is_windows:
            output = subprocess.check_output(["arp", "-a", ip], stderr=subprocess.DEVNULL).decode("utf-8", errors="ignore")
            match = re.search(r"([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}", output)
            if match:
                return match.group(0).replace("-", ":").lower()
        else:
            output = subprocess.check_output(["arp", "-n", ip], stderr=subprocess.DEVNULL).decode("utf-8", errors="ignore")
            match = re.search(r"([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}", output)
            if match:
                return match.group(0).lower()
    except Exception:
        pass
    return None

async def check_port_async(ip: str, port: int) -> bool:
    """
    Asynchronously checks if a TCP port is open on the target IP.
    """
    try:
        conn = asyncio.open_connection(ip, port)
        reader, writer = await asyncio.wait_for(conn, timeout=0.25)
        writer.close()
        await writer.wait_closed()
        return True
    except Exception:
        return False

async def profile_device(ip: str, mac: str) -> Dict[str, str]:
    """
    Intelligently profiles a device using MAC address (OUI), reverse DNS hostname,
    and open TCP ports. Returns a dictionary containing 'name' and 'category'.
    """
    # 1. Resolve MAC OUI Manufacturer
    vendor = "Generic Brand"
    if mac and mac != "unknown":
        oui = "".join(mac.split(":")[:3]).lower().replace("-", "")
        vendors = {
            "001122": "Ubiquiti Networks",
            "0418d6": "Ubiquiti Networks",
            "001a11": "TP-Link",
            "48a98a": "TP-Link",
            "b827eb": "Raspberry Pi",
            "dca632": "Raspberry Pi",
            "3cd92b": "HP",
            "705a0f": "HP",
            "005056": "VMware Virtual",
            "000c29": "VMware Virtual",
            "00155d": "Microsoft Virtual",
            "c05627": "Apple",
            "ac1f6b": "Apple",
            "d4619d": "Apple",
            "002590": "Supermicro",
            "ac1f6b": "Intel",
            "a4fc77": "Intel",
        }
        vendor = vendors.get(oui, "Generic Brand")

    # 2. Resolve Hostname (reverse DNS lookup)
    def resolve_dns(target_ip: str) -> str:
        try:
            return socket.gethostbyaddr(target_ip)[0]
        except Exception:
            return ""
    hostname = await asyncio.to_thread(resolve_dns, ip)

    # 3. Probe common ports in parallel (timeout = 250ms)
    ports_to_check = [22, 80, 443, 554, 3389, 9100]
    probe_tasks = [check_port_async(ip, p) for p in ports_to_check]
    probe_results = await asyncio.gather(*probe_tasks)
    open_ports = [p for p, opened in zip(ports_to_check, probe_results) if opened]

    # 4. Classify device role and name
    category = "PC"
    friendly_name = hostname if hostname else f"Workstation ({ip})"

    # Rule 1: Printer
    if 9100 in open_ports or "printer" in hostname.lower() or "hp" in vendor.lower():
        category = "Printer"
        friendly_name = f"{vendor} LaserJet Printer" if "hp" in vendor.lower() else f"{vendor} Network Printer"
    # Rule 2: CCTV
    elif 554 in open_ports or "cctv" in hostname.lower() or "camera" in hostname.lower():
        category = "CCTV"
        friendly_name = f"{vendor} CCTV IP Camera" if vendor != "Generic Brand" else "CCTV IP Camera"
    # Rule 3: Router
    elif ip.endswith(".1") or "router" in hostname.lower() or "gateway" in hostname.lower():
        category = "Router"
        friendly_name = f"{vendor} Gateway Router"
    # Rule 4: Network Switch
    elif "switch" in hostname.lower() or ("ubiquiti" in vendor.lower() and 22 in open_ports):
        category = "Switch"
        friendly_name = f"{vendor} Managed Switch"
    # Rule 5: KDS (Kitchen Display System using Raspberry Pi)
    elif "raspberry" in vendor.lower():
        category = "Monitor KDS"
        friendly_name = "Kitchen Display Monitor (KDS)"
    # Rule 6: POS Terminal
    elif "pos" in hostname.lower():
        category = "POS"
        friendly_name = f"Point of Sale Terminal"

    return {
        "name": friendly_name,
        "category": category
    }

async def run_discovery_scan(subnet_prefix: str = "192.168.1") -> List[Dict[str, str]]:
    """
    Runs a discovery scan on a subnet prefix.
    Resolves MAC addresses and profiles device type using ports/DNS.
    """
    semaphore = asyncio.Semaphore(50)  # Limit concurrent pings
    tasks = []
    
    # Sweep IPs 1.1 through 1.254
    for i in range(1, 255):
        ip = f"{subnet_prefix}.{i}"
        tasks.append(ping_ip(ip, semaphore))
        
    results = await asyncio.gather(*tasks)
    
    online_ips = []
    for r in results:
        if r and r["online"]:
            online_ips.append(r["ip"])
            
    # For each online device, resolve MAC and profile device concurrently
    profile_tasks = []
    for ip in online_ips:
        mac = get_mac_from_arp(ip)
        profile_tasks.append(profile_device(ip, mac if mac else "unknown"))
        
    profiles = await asyncio.gather(*profile_tasks)
    
    discovered_devices = []
    for ip, profile in zip(online_ips, profiles):
        mac = get_mac_from_arp(ip)
        discovered_devices.append({
            "ip_address": ip,
            "mac_address": mac if mac else "unknown",
            "name": profile["name"],
            "category": profile["category"],
            "status": "online"
        })
        
    return discovered_devices
