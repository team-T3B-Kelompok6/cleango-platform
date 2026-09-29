import os
import runpy

POSTGRES_BIN = r"D:\Alat Tempur\Fly Env\FlyEnv-Data\app\postgresql-18.6\pgsql\bin"
PGADMIN_RUNTIME = r"D:\Alat Tempur\Fly Env\FlyEnv-Data\app\postgresql-18.6\pgsql\pgAdmin 4\runtime"
PGADMIN_ENTRYPOINT = r"D:\Alat Tempur\Fly Env\FlyEnv-Data\app\postgresql-18.6\pgsql\pgAdmin 4\web\pgAdmin4.py"

os.add_dll_directory(POSTGRES_BIN)
os.add_dll_directory(PGADMIN_RUNTIME)
runpy.run_path(PGADMIN_ENTRYPOINT, run_name="__main__")
