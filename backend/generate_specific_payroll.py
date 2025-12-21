import pandas as pd

# Data requested by user
# Lucas Silva (20240000), Ana Santos (20240001), Pedro Oliveria (20240002)
# Using arbitrary costs matching similar roles
specific_data = [
    {"name": "Lucas Silva", "registration": "20240000", "cost": 12500.00},
    {"name": "Ana Santos", "registration": "20240001", "cost": 8600.50},
    {"name": "Pedro Oliveira", "registration": "20240002", "cost": 9200.00},
]

data = []
for item in specific_data:
    # Create a row with empty columns up to G (index 6) matches logic
    # Col A(0), B(1), C(2), D(3)-Cost, E(4), F(5), G(6)-Matricula
    row = [None] * 7
    row[0] = item["name"] # Optional: Put name in Col A for readability (Backend ignores this, but helpful for human)
    row[3] = item["cost"] # Column D
    row[6] = item["registration"] # Column G
    data.append(row)

# Create DataFrame
df = pd.DataFrame(data, columns=['Name', 'B', 'C', 'Total Cost', 'E', 'F', 'Registration'])

# Save
filename = "folha_teste_nomes.xlsx"
df.to_excel(filename, index=False)
print(f"Created {filename}")
