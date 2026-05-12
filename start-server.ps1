$out = "c:\Users\Administrator\Desktop\StatusHub - Copy\.logs\server-out.log"
$err = "c:\Users\Administrator\Desktop\StatusHub - Copy\.logs\server-err.log"
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$proc = Start-Process -FilePath "node" `
    -ArgumentList "node_modules/next/dist/bin/next","dev","-p","3001" `
    -WorkingDirectory "c:\Users\Administrator\Desktop\StatusHub - Copy" `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err `
    -WindowStyle Hidden `
    -PassThru
Write-Host $proc.Id
