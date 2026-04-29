import ipaddress
import sys

target_ip = ipaddress.ip_address(sys.argv[1])
found = False

with open('.agent/scratch/russia-mobile-internet-whitelist/cidrwhitelist.txt') as f:
    for line in f:
        cidr = line.strip()
        if not cidr or cidr.startswith('#'):
            continue
        try:
            network = ipaddress.ip_network(cidr)
            if target_ip in network:
                print(f"Match found! IP {target_ip} is in {network}")
                found = True
                break
        except ValueError:
            pass

if not found:
    print(f"IP {target_ip} not found in whitelist.")
