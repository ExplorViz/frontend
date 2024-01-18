# Extended Reality Rendering

ExplorViz provides Virtual Reality (VR) and Augmented Reality (AR) rendering next to the on-screen (Desktop) version.
All three renderings can be used in our [collaborative environment](../collaborative-mode/README.md), therefore, have the potential to form a device-heterogeneous (mixed) environment.

## Virtual Reality Development

VR devices are often used with a connected PC, therefore, you will have access to your PC's web browser and its development tools.
The following presents additional information that are necessary to use the Meta Quest 2 for development.

### Meta Quest 2

Information can also be found here: https://developer.oculus.com/documentation/web/browser-remote-debugging/

1. Make sure that HMD and computer are on the same network.
2. Connect activated HMD via cable to your computer.
3. In HMD: Allow connection to computer.
4. In terminal: Use `adb devices` to check if HMD is connected.
5. In terminal: Write `adb shell ip addr show wlan0` to retrieve HMD IP.
6. In terminal: Restart adb in TCP mode via `adb tcpip 5555`
7. In terminal: Connect to device `adb connect <DEVICEIP>:5555`
8. Remove cable.
9. In terminal: `adb reverse tcp:4200 tcp:4200 && adb reverse tcp:8083 tcp:8083 && adb reverse tcp:8084 tcp:8084` to port forward the ExplorViz frontend and demo-supplier or backend.
10. In HMD: Browse to http://localhost:4200 in Meta Quest Browser.
11. Computer: Launch Google Chrome and navigate to `chrome://inspect/#devices`
12. Computer: Click inspect for `http://localhost:4200` under Quest 2.
