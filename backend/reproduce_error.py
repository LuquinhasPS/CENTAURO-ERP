import urllib.request
import json

def reproduce():
    url = "http://127.0.0.1:8000/operational/collaborators/1"
    
    payload = {
        "name": "Lucas Pereira da Silva",
        "cpf": "222.222.222-22",
        "rg": "11.111.111-1",
        "email": "lucaspsilva_@hotmail.com",
        "phone": "(24) 98103-2108",
        "salary": "11.111.111.111,11",
        "role_id": 1,
        "role": "Coordenador",
        "cnh_number": "1111111",
        "cnh_category": "A",
        "cnh_validity": "2025-11-28"
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='PUT')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status: {response.status}")
            print(f"Response: {response.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(f"Response: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reproduce()
