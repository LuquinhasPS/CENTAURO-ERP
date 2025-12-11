import pkgutil
import langchain
import langchain_community

print(f"LangChain path: {langchain.__path__}")
print(f"LangChain Community path: {langchain_community.__path__}")

try:
    import langchain.chains
    print("Successfully imported langchain.chains")
    if hasattr(langchain.chains, "create_sql_query_chain"):
        print("Found create_sql_query_chain in langchain.chains")
    else:
        print("create_sql_query_chain NOT in langchain.chains")
        print(f"Available: {[x for x in dir(langchain.chains) if 'sql' in x.lower()]}")
except ImportError as e:
    print(f"ImportError importing langchain.chains: {e}")

try:
    from langchain.chains import create_sql_query_chain
    print("Wait, direct import worked?")
except ImportError:
    print("Direct import failed.")
    
# Check specific file location if possible
try:
    import langchain.chains.sql_database.query
    print("Imported langchain.chains.sql_database.query")
except ImportError as e:
    print(f"Failed deep import: {e}")
