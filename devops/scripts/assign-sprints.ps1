<#
.SYNOPSIS
  Crea Sprint 1-3 en ArrowOps, los agrega al equipo y asigna User Stories y Tasks
  segun la Feature a la que pertenecen (orden de docs/backlog-ids.csv):
    Features 1 y 2 (API, Interfaz web)      -> Sprint 1  (Fase 1)
    Feature 3     (CI y seguridad)          -> Sprint 2  (Fase 2)
    Feature 4     (Estabilizacion y release) -> Sprint 3  (Fase 3)
      excepto la Story del agente autohospedado y sus Tasks -> Sprint 2
  Epics y Features quedan en la raiz porque abarcan varios sprints.
  Es idempotente: si un sprint ya existe, solo actualiza sus fechas.

.EXAMPLE
  $env:AZURE_DEVOPS_EXT_PAT = "<tu PAT>"
  .\devops\scripts\assign-sprints.ps1 -Org "https://dev.azure.com/devopsArrow" -Project "ArrowOps"
#>
param(
    [Parameter(Mandatory)] [string] $Org,
    [Parameter(Mandatory)] [string] $Project,
    [string] $Team = "$Project Team",
    [string] $CsvFile = "docs/backlog-ids.csv",
    [datetime] $FirstSprintStart = "2026-10-26",
    [int] $SprintDays = 7
)

$ErrorActionPreference = "Stop"

az devops configure --defaults organization=$Org project=$Project
if ($LASTEXITCODE -ne 0) { throw "No se pudo configurar az devops." }

# 1. Crear (o actualizar) los sprints y agregarlos al equipo
$existing = az boards iteration project list --depth 1 --query "children[].{name:name, id:identifier}" --detect false -o json | ConvertFrom-Json

foreach ($n in 1..3) {
    $name   = "Sprint $n"
    $start  = $FirstSprintStart.AddDays(($n - 1) * $SprintDays).ToString("yyyy-MM-dd")
    $finish = $FirstSprintStart.AddDays($n * $SprintDays - 1).ToString("yyyy-MM-dd")

    $match = $existing | Where-Object { $_.name -eq $name }
    if ($match) {
        az boards iteration project update --path "\$Project\Iteration\$name" --start-date $start --finish-date $finish --detect false -o none
        $iterationId = $match.id
    } else {
        $iterationId = az boards iteration project create --name $name --start-date $start --finish-date $finish --query identifier --detect false -o tsv
    }
    if ($LASTEXITCODE -ne 0 -or -not $iterationId) { throw "Fallo al crear/actualizar $name." }

    # Si ya estaba en el equipo, az devuelve error; no es critico.
    $ErrorActionPreference = "Continue"
    az boards iteration team add --id $iterationId --team $Team --detect false -o none 2>$null
    $ErrorActionPreference = "Stop"
    Write-Host "$name  $start -> $finish"
}

# 2. Asignar Stories y Tasks al sprint de su Feature
$items    = Import-Csv $CsvFile
$byId     = @{}; $items | ForEach-Object { $byId[$_.Id] = $_ }
$features = @($items | Where-Object Type -eq "Feature")
$sprintOfFeature = @{
    $features[0].Id = "Sprint 1"; $features[1].Id = "Sprint 1"
    $features[2].Id = "Sprint 2"; $features[3].Id = "Sprint 3"
}

# Excepcion: el agente autohospedado y el fallo controlado son de la Fase 2,
# aunque su Feature (Estabilizacion y release) pertenezca a la Fase 3.
$agentStory = $items | Where-Object { $_.Type -ne "Task" -and $_.Title -like "*agente autohospedado*" }

foreach ($item in $items | Where-Object { $_.Type -notin "Epic", "Feature" }) {
    $node = $item
    while ($node.Type -ne "Feature") { $node = $byId[$node.ParentId] }
    $sprint = $sprintOfFeature[$node.Id]
    if ($agentStory -and ($item.Id -eq $agentStory.Id -or $item.ParentId -eq $agentStory.Id)) { $sprint = "Sprint 2" }

    az boards work-item update --id $item.Id --iteration "$Project\$sprint" --detect false -o none
    if ($LASTEXITCODE -ne 0) { throw "Fallo al asignar AB#$($item.Id) a $sprint." }
    Write-Host ("AB#{0,-3} -> {1}  {2}" -f $item.Id, $sprint, $item.Title)
}
