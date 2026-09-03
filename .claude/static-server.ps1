# Minimaler statischer Dateiserver für die lokale Vorschau (Claude-Code-
# Browser-Pane, siehe .claude/launch.json). Kein Build-System, keine
# externe Abhängigkeit — reines .NET über PowerShell.
#
# Bewusst TcpListener statt HttpListener: HttpListener mit dem Prefix
# "http://localhost:$port/" läuft zwar ohne Admin-Rechte, bindet den
# Socket dabei aber laut netstat auf 0.0.0.0/[::] (alle Netzwerk-
# schnittstellen) und leitet Anfragen allein anhand des Host-Headers
# weiter — GEPRÜFT (curl von der eigenen LAN-IP mit Host: localhost
# ergab HTTP 200): jeder andere Rechner im selben Netz kommt mit
# gefälschtem Host-Header durch und könnte das komplette Projekt-
# verzeichnis lesen. Ein TcpListener, der explizit an
# [IPAddress]::Loopback gebunden wird, umgeht das Problem auf
# Socket-Ebene — von außerhalb dieses Rechners ist der Port dann unter
# keinen Umständen erreichbar, unabhängig vom Host-Header. Bindung an
# die literale IP 127.0.0.1 wäre bei HttpListener die saubere Lösung
# gewesen, verlangt dort aber ohne vorherige "netsh http add urlacl"-
# Reservierung Admin-Rechte (Access denied) — TcpListener braucht das
# nicht.
$root = (Get-Location).Path
$port = 8123

$mime = @{
  ".html"="text/html"; ".css"="text/css"; ".js"="application/javascript";
  ".json"="application/json"; ".svg"="image/svg+xml"; ".webp"="image/webp";
  ".png"="image/png"; ".ico"="image/x-icon"
}

$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "Serving $root on http://127.0.0.1:$port/ (nur lokal erreichbar, TcpListener an Loopback gebunden)"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object IO.StreamReader($stream)
    $requestLine = $reader.ReadLine()
    # Restliche Header verwerfen (bis zur Leerzeile) — werden für einen
    # simplen statischen Dateiserver nicht ausgewertet.
    while (($null -ne ($line = $reader.ReadLine())) -and ($line -ne "")) { }

    $status = "200 OK"
    $bytes = $null
    $contentType = "application/octet-stream"

    if ($requestLine -and $requestLine.StartsWith("GET ")) {
      $target = $requestLine.Split(" ")[1]
      $path = [Uri]::UnescapeDataString(($target -split '\?')[0])
      if ($path -eq "/") { $path = "/index.html" }
      if ($path.EndsWith("/")) { $path = $path + "index.html" }
      $full = Join-Path $root ($path.TrimStart("/"))
      $fullResolved = [IO.Path]::GetFullPath($full)
      # Pfad-Traversal ausschließen: aufgelöster Pfad muss unterhalb von $root liegen.
      if (-not $fullResolved.StartsWith([IO.Path]::GetFullPath($root))) {
        $status = "403 Forbidden"
      } elseif (Test-Path $fullResolved -PathType Leaf) {
        $ext = [IO.Path]::GetExtension($fullResolved)
        if ($mime[$ext]) { $contentType = $mime[$ext] }
        $bytes = [IO.File]::ReadAllBytes($fullResolved)
      } else {
        $status = "404 Not Found"
      }
    } else {
      $status = "405 Method Not Allowed"
    }

    if (-not $bytes) { $bytes = [byte[]]@() }
    $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
  } catch {
    # Verbindung des Clients abgebrochen o.ä. — für einen lokalen Dev-Server unkritisch.
  } finally {
    $client.Close()
  }
}
