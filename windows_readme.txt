To install on Windows at the time of writing (Jan 2016) you will need:
node 4.2.6 or above
redis:   https://github.com/MSOpenTech/redis/releases
A C++ compiler:  https://github.com/nodejs/node-gyp/issues/629#issuecomment-153196245
 
Regarding C++ compiler, this was the way to go at the time of writing:
Install VC++ Build Tools Technical Preview, choose Custom Install, and select both Windows 8.1 and Windows 10 SDKs.

NOTE: [Windows 7 only] requires .NET Framework 4.5.1
Install Python 2.7, and add it to your PATH, "npm config set python <insert path to your python.exe - e.g. C:\Python\python.exe>"
Also add the path to the python.exe to your windows PATH environment variable.

Launch cmd, "npm config set msvs_version 2015 --global" 
(this is instead of npm install [package name] --msvs_version=2015 every time.)

Navigate to the folder containing this file in a cmd prompt and then run "npm install"

A useful resource:  https://github.com/Microsoft/nodejs-guidelines

I also ran into an error using redis:  "MISCONF Redis is configured to save RDB snapshots, but is currently not able to persist on disk."

To fix that I ran c:\program files\redis\redis-cli
then
config set stop-writes-on-bgsave-error no
Not a solution but a workaround