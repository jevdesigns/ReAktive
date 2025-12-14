@echo off
echo ===============================================
echo  ReactiveDash Raspberry Pi Update Script
echo ===============================================
echo.
echo This script will automatically update your
echo Raspberry Pi Home Assistant with the new
echo NGINX-based ReactiveDash dashboard.
echo.
echo Usage:
echo   update_raspberry_pi.ps1 [parameters]
echo.
echo Required Parameters:
echo   -RaspberryPiIP     : Your Raspberry Pi IP address
echo   -SSHUsername       : SSH username (usually 'pi')
echo.
echo Optional Parameters:
echo   -SSHPassword       : SSH password (if using password auth)
echo   -SSHKeyPath        : Path to SSH private key (default: ~/.ssh/id_rsa)
echo   -HAConfigPath      : HA config path (default: /config)
echo   -UsePasswordAuth   : Use password authentication instead of SSH key
echo.
echo Examples:
echo.
echo Using SSH key (default):
echo   .\update_raspberry_pi.ps1 -RaspberryPiIP 192.168.1.100 -SSHUsername pi
echo.
echo Using password:
echo   .\update_raspberry_pi.ps1 -RaspberryPiIP 192.168.1.100 -SSHUsername pi -SSHPassword mypassword -UsePasswordAuth
echo.
echo Custom SSH key:
echo   .\update_raspberry_pi.ps1 -RaspberryPiIP 192.168.1.100 -SSHUsername pi -SSHKeyPath "C:\path\to\key"
echo.
echo ===============================================
pause