# Databricks Integration Recipes

Use `sql-warehouse/README.md` when a generated MISO website app needs read-only Databricks SQL warehouse query results.

Do not install Databricks native drivers in the sandbox. Use the included PocketBase route and `runtimeProxy.proxyFetch`.
