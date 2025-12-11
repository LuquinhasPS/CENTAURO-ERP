import importlib
import pkgutil
import os
import sys

def find_function(package_name, func_name):
    package = importlib.import_module(package_name)
    if hasattr(package, "__path__"):
        for _, name, is_pkg in pkgutil.walk_packages(package.__path__, package.__name__ + "."):
            if "test" in name: continue
            try:
                module = importlib.import_module(name)
                if hasattr(module, func_name):
                    print(f"FOUND: {func_name} in {name}")
                    return
            except Exception:
                pass

print("Searching in langchain...")
try:
    find_function("langchain", "create_sql_query_chain")
except Exception as e:
    print(e)
    
print("Searching in langchain_community...")
try:
    find_function("langchain_community", "create_sql_query_chain")
except Exception as e:
    print(e)
