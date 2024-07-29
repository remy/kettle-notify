# Kettle

1. Add plug to the home, and power it on (using the side button as well as the wall switch)
2. The plug has it's own wifi along the lines of "tasmota" - connect to this wifi network
3. In the browser you'll be prompted to set the wifi ssid and the wifi password
4. Once the plug has restarted, it will now be connected to your home network (your wifi ssid), using an app like Fing, find the smart plug IP address
5. Now visit the IP in your browser, click "Configuration", "Configure MMQT"
6. Enter the host IP address, the username and the password

The plug should now be connected.

Using a tool like [Tasmota Device Manager](https://tasmota.github.io/docs/Tasmota-Device-Manager/) you will need to do a number of things:

1. Enable the timers: enable the checkbox, select Timer1, check arm and repeat, set select dropdowns to "POWER" and "Rule", then set the appropriate time and check Sun through to Sat and save. Repeat for Timer2
2. Set the rules: click the rules button, enter the rule into the Rule Editor, then click upload, then "Enable" and "Once". Only repeat for rule 2
3. Rename the device: in the console use `DeviceName Mum's kettle` and then `FriendlyName1 Mum's kettle`
4. Restart: `Restart 1` means to save config and reboot
