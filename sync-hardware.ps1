# PC Hardware Sync & Quick Enrollment Agent (Standalone Server Version)
param(
    [string]$DeviceType = ''
)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Server Configuration
$ServerHost   = '10.15.30.241'             # Server IP
$WebPort      = '8087'                     # Quick Enroll Standalone Nginx Port
$WebPath      = ''                         # Optional subpath prefix, leave empty if root


try {
    Write-Host 'Scanning system specifications...' -ForegroundColor Cyan
    $ComputerName = $env:COMPUTERNAME

    $Bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1
    $SerialNumber = 'N/A-' + $ComputerName
    if ($Bios -and $Bios.SerialNumber) { 
        $SerialNumber = $Bios.SerialNumber.Trim() 
    }

    $OSObj = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    $OS = 'Windows'
    if ($OSObj -and $OSObj.Caption) { 
        $OS = $OSObj.Caption.Trim() 
    }

    $CpuObj = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
    $Cpu = 'N/A'
    if ($CpuObj -and $CpuObj.Name) { 
        $Cpu = $CpuObj.Name.Trim() 
    }

    # RAM Capacity, Type & Count Detection
    $MemList = Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue
    $TotalBytes = ($MemList | Measure-Object -Property Capacity -Sum).Sum
    $RamGb = 0
    if ($TotalBytes) { 
        $RamGb = [math]::Round(($TotalBytes / 1GB), 2) 
    }
    $RamCount = 1
    if ($MemList) { 
        $RamCount = $MemList.Count 
    }

    $RamType = 'DDR4'
    if ($MemList) {
        foreach ($m in $MemList) {
            $sm = $m.SMBIOSMemoryType
            $mt = $m.MemoryType
            $speed = $m.Speed

            if ($sm -eq 34 -or $mt -eq 34) { $RamType = 'DDR5'; break }
            elseif ($sm -eq 26 -or $mt -eq 26) { $RamType = 'DDR4'; break }
            elseif ($sm -eq 24 -or $mt -eq 24) { $RamType = 'DDR3'; break }
            elseif ($sm -eq 21 -or $mt -eq 21) { $RamType = 'DDR2'; break }
            elseif ($speed -ge 4800) { $RamType = 'DDR5'; break }
            elseif ($speed -ge 2133) { $RamType = 'DDR4'; break }
            elseif ($speed -ge 1066) { $RamType = 'DDR3'; break }
        }
    }

    $BoardObj = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1
    $Motherboard = 'N/A'
    if ($BoardObj) { 
        $Motherboard = ($BoardObj.Manufacturer + ' ' + $BoardObj.Product).Trim() 
    }

    # Disk Capacity & Type Detection (NVMe SSD, SATA SSD, HDD)
    $DiskItems = @()
    $DiskTypes = @()

    $PhysDisks = Get-PhysicalDisk -ErrorAction SilentlyContinue
    if ($PhysDisks) {
        foreach ($pd in $PhysDisks) {
            $sz = [math]::Round($pd.Size / 1GB, 0)
            $model = $pd.FriendlyName
            $bus = $pd.BusType
            $media = [string]$pd.MediaType

            $typeStr = 'SSD'
            if ($media -eq 'HDD') {
                $typeStr = 'HDD'
            } elseif ($bus -eq 'NVMe' -or $model -match 'NVMe') {
                $typeStr = 'NVMe SSD'
            } elseif ($media -eq 'SSD' -or $model -match 'SSD' -or $model -match 'Solid State') {
                $typeStr = 'SSD'
            } else {
                if ($model -match 'SSD' -or $model -match 'SanDisk' -or $model -match 'Kingston' -or $model -match 'Crucial' -or $model -match 'EVO' -or $model -match 'PRO') {
                    $typeStr = 'SSD'
                } else {
                    $typeStr = 'HDD'
                }
            }

            if (-not ($DiskTypes -contains $typeStr)) {
                $DiskTypes += $typeStr
            }
            $DiskItems += ($typeStr + ' - ' + $model + ' (' + $sz + ' GB)')
        }
    } else {
        $Drives = Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue
        foreach ($d in $Drives) {
            $sz = [math]::Round($d.Size / 1GB, 0)
            $model = $d.Model
            $interface = $d.InterfaceType

            $typeStr = 'HDD'
            if ($model -match 'NVMe' -or $interface -match 'NVMe') {
                $typeStr = 'NVMe SSD'
            } elseif ($model -match 'SSD' -or $d.MediaType -match 'SSD' -or $model -match 'Solid State' -or $model -match 'SanDisk' -or $model -match 'Kingston' -or $model -match 'Crucial') {
                $typeStr = 'SSD'
            }

            if (-not ($DiskTypes -contains $typeStr)) {
                $DiskTypes += $typeStr
            }
            $DiskItems += ($typeStr + ' - ' + $model + ' (' + $sz + ' GB)')
        }
    }

    $Disks = 'N/A'
    if ($DiskItems.Count -gt 0) { 
        $Disks = [string]::Join(' | ', $DiskItems)
    }
    $DiskTypeSummary = 'SSD'
    if ($DiskTypes.Count -gt 0) {
        $DiskTypeSummary = [string]::Join(' / ', $DiskTypes)
    }

    $GpuItems = @()
    $VramList = @()
    $Gpus = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue
    foreach ($g in $Gpus) {
        if ($g.Name) { $GpuItems += $g.Name.Trim() }
        if ($g.AdapterRAM -and $g.AdapterRAM -gt 0) {
            $VramGb = [math]::Round($g.AdapterRAM / 1GB, 1)
            # Only add AdapterRAM if it's not the WMI 4GB uint32 capped value (4294967295 / 4GB)
            if ($g.AdapterRAM -lt 4290000000) {
                $VramList += $VramGb
            }
        }
    }

    # 1. Try nvidia-smi (checking common NVIDIA paths + System PATH + DriverStore)
    $nvsmiPaths = @(
        'nvidia-smi',
        'C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe',
        'C:\Windows\System32\nvidia-smi.exe'
    )
    $dsNvsmi = Get-ChildItem 'C:\Windows\System32\DriverStore\FileRepository' -Filter 'nvidia-smi.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
    if ($dsNvsmi) { $nvsmiPaths += $dsNvsmi }

    foreach ($exe in $nvsmiPaths) {
        try {
            if (Get-Command $exe -ErrorAction SilentlyContinue) {
                $out = & $exe --query-gpu=memory.total --format=csv,noheader,nounits 2>$null
                if ($out) {
                    $mb = [double]($out | Select-Object -First 1).Trim()
                    if ($mb -gt 0) {
                        $VramList += [math]::Round($mb / 1024, 0)
                    }
                }
            }
        } catch {}
    }

    # 2. Try Windows Registry (64-bit GPU Memory Size)
    try {
        $gpuKeys = Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue
        foreach ($k in $gpuKeys) {
            $p = Get-ItemProperty $k.PSPath -ErrorAction SilentlyContinue
            if ($p.DriverDesc -and $p.DriverDesc -notlike '*Basic*') {
                $rawList = @(
                    $p.'HardwareInformation.qwMemorySize',
                    $p.'qwMemorySize',
                    $p.'HardwareInformation.MemorySize',
                    $p.'HardwareInformation.AdapterRAM',
                    $p.'AdapterRAM'
                )

                foreach ($raw in $rawList) {
                    if ($raw) {
                        $val = 0
                        if ($raw -is [byte[]]) {
                            if ($raw.Count -ge 8) { $val = [BitConverter]::ToUInt64($raw, 0) }
                            elseif ($raw.Count -ge 4) { $val = [BitConverter]::ToUInt32($raw, 0) }
                        } elseif ($raw -is [number] -or $raw -is [long] -or $raw -is [int] -or $raw -is [ulong]) {
                            $val = [uint64]$raw
                        }

                        if ($val -gt 0) {
                            $gb = [math]::Round($val / 1GB, 0)
                            if ($gb -gt 0) { $VramList += $gb }
                        }
                    }
                }
            }
        }
    } catch {}

    $Gpu = 'N/A'
    if ($GpuItems.Count -gt 0) { 
        $Gpu = [string]::Join(' | ', $GpuItems)
    }
    $VramGbTotal = 0
    if ($VramList.Count -gt 0) {
        $VramGbTotal = ($VramList | Measure-Object -Maximum).Maximum
    }
    # If WMI capping occurred and no higher VRAM detected, set 4 as minimum fallback
    if ($VramGbTotal -eq 0 -and $GpuItems.Count -gt 0) {
        $VramGbTotal = 4
    }

    $NetAdapter = Get-CimInstance Win32_NetworkAdapterConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1
    $MacAddress = 'N/A'
    $IpAddress = 'N/A'
    if ($NetAdapter) {
        if ($NetAdapter.MACAddress) { $MacAddress = $NetAdapter.MACAddress }
        if ($NetAdapter.IPAddress) { $IpAddress = $NetAdapter.IPAddress[0] }
    }

    # Screen Size Detection (from EDID via WMI - works for built-in laptop screens)
    $ScreenSize = 'N/A'
    try {
        $monitors = Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue
        $sizeList = @()
        foreach ($mon in $monitors) {
            $h = $mon.MaxHorizontalImageSize
            $v = $mon.MaxVerticalImageSize
            if ($h -and $v -and $h -gt 0 -and $v -gt 0) {
                $diagCm = [math]::Sqrt(($h * $h) + ($v * $v))
                $diagInch = [math]::Round($diagCm / 2.54, 1)
                if ($diagInch -gt 5 -and $diagInch -lt 120) {
                    $sizeList += $diagInch
                }
            }
        }
        if ($sizeList.Count -gt 0) {
            # Take the smallest screen (most likely the built-in laptop display)
            $smallest = ($sizeList | Measure-Object -Minimum).Minimum
            $ScreenSize = [string]$smallest + '"'
        }
    } catch {}

    Write-Host 'Hardware scan complete — preparing enrollment URL...' -ForegroundColor Cyan

    Write-Host 'Building URL and opening Quick Enrollment Form...' -ForegroundColor Green

    # Encode all hardware specs as URL params — no database storage needed
    $PathPrefix = ""
    if ($WebPath -and $WebPath.Trim() -ne "") {
        $PathPrefix = "/" + $WebPath.Trim("/")
    }

    $Params = [System.Collections.Generic.List[string]]::new()
    $Params.Add("serial=" + [uri]::EscapeDataString($SerialNumber))
    $Params.Add("comp="   + [uri]::EscapeDataString($ComputerName))
    $Params.Add("cpu="    + [uri]::EscapeDataString($Cpu))
    $Params.Add("ram="    + $RamGb)
    $Params.Add("ram_type=" + [uri]::EscapeDataString($RamType))
    $Params.Add("ram_count=" + $RamCount)
    $Params.Add("gpu="    + [uri]::EscapeDataString($Gpu))
    $Params.Add("vram="   + $VramGbTotal)
    $Params.Add("disks="  + [uri]::EscapeDataString($Disks))
    $Params.Add("disk_type=" + [uri]::EscapeDataString($DiskTypeSummary))
    $Params.Add("mb="     + [uri]::EscapeDataString($Motherboard))
    $Params.Add("mac="    + [uri]::EscapeDataString($MacAddress))
    $Params.Add("ip="     + [uri]::EscapeDataString($IpAddress))
    $Params.Add("screen=" + [uri]::EscapeDataString($ScreenSize))
    if ($DeviceType) {
        $Params.Add("type=" + [uri]::EscapeDataString($DeviceType))
    }

    $WebUrl = "http://${ServerHost}:${WebPort}${PathPrefix}/index.html?" + [string]::Join("&", $Params)
    Start-Process $WebUrl

    Write-Host '============================================' -ForegroundColor Green
    Write-Host '  SUCCESS! Hardware scanned successfully.' -ForegroundColor Green
    Write-Host ('  Serial S/N:   ' + $SerialNumber) -ForegroundColor White
    Write-Host ('  RAM:          ' + $RamType + ' ' + $RamGb + ' GB (' + $RamCount + ' sticks)') -ForegroundColor White
    Write-Host ('  VRAM:         ' + $VramGbTotal + ' GB') -ForegroundColor White
    Write-Host ('  Disk:         ' + $DiskTypeSummary) -ForegroundColor White
    Write-Host ('  Screen:       ' + $ScreenSize) -ForegroundColor White
    Write-Host ('  Opening URL:  ' + $WebUrl) -ForegroundColor Cyan
    Write-Host '============================================' -ForegroundColor Green
}
catch {
    Write-Host '============================================' -ForegroundColor Red
    Write-Host ('  ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host '============================================' -ForegroundColor Red
}
