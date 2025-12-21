import pandas as pd
import random
from datetime import date

# Generate sample data matching the seed logic (20240000 to 202400XX)
data = []
for i in range(10): # First 10 collaborators
    registration = f"2024{i:04d}"
    cost = random.randint(3000, 15000)
    
    # Create a row with empty columns up to G (index 6) matches logic
    # Col A(0), B(1), C(2), D(3)-Cost, E(4), F(5), G(6)-Matricula
    row = [None] * 7
    row[3] = cost # Column D
    row[6] = registration # Column G
    data.append(row)

# Create DataFrame
df = pd.DataFrame(data, columns=['A', 'B', 'C', 'Total Cost', 'E', 'F', 'Registration'])

# Save
filename = "folha_exemplo.xlsx"
df.to_excel(filename, index=False)
print(f"Created {filename}")
