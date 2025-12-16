# ReAktive Add-on Repository

Home Assistant add-on repository for ReAktive dashboard.

[![Add Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fjevdesigns%2FReAktive)

## Add-ons

This repository contains the following add-on:

### [ReAktive](./reaktive)

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armhf Architecture][armhf-shield]
![Supports armv7 Architecture][armv7-shield]

A modern, high-performance Home Assistant dashboard built with React and NGINX.

## Installation

1. Click the button above or manually add this repository URL to your Home Assistant:
   ```
   https://github.com/jevdesigns/ReAktive
   ```

2. Go to **Settings → Add-ons → Add-on Store**

3. Find **ReAktive** in the list

4. Click **Install**

5. Start the add-on

6. Access at: **http://homeassistant.local:3000**

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/jevdesigns/ReAktive/issues).

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg

## Deployment (local & remote)

This repository includes a helper PowerShell script `deploy_to_z.ps1` that copies the add-on files into a Home Assistant add-ons folder ready for Supervisor to build.

- Common usage (local mapped drive):
```powershell
.\deploy_to_z.ps1
```

- Build then deploy (runs `npm ci` + `npm run build` in the client folder before copying):
```powershell
.\deploy_to_z.ps1 -BuildClient
```

- Remote via SMB (maps `\\<host>\config` to `Y:`):
```powershell
.\deploy_to_z.ps1 -RemoteHost 192.168.1.100 -TargetPath 'Y:\addons\local\reaktive'
```

- Remote via SCP/SSH (recommended when you need to set `run.sh` executable):
```powershell
.\deploy_to_z.ps1 -RemoteHost 10.0.0.5 -UseSCP -SSHUser root -TargetPath '/config/addons/local/reaktive' -SetExec -SSHKey C:\keys\id_rsa
```

- Dry run (prints actions without making changes):
```powershell
.\deploy_to_z.ps1 -BuildClient -DryRun
```

Notes:
- `-SetExec` only runs `chmod +x run.sh` over SSH; it is not possible to set Linux executable bits reliably over SMB.
- Ensure `scp`/`ssh` are available in your PowerShell environment when using `-UseSCP`.

