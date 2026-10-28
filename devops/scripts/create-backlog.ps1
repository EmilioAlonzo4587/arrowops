<#
.SYNOPSIS
  Crea el backlog inicial de ArrowOps en Azure Boards:
  2 Epics, 4 Features, 8 User Stories y 16 Tasks enlazados padre-hijo,
  con responsable, prioridad, estimacion y estado inicial.

.EXAMPLE
  $env:AZURE_DEVOPS_EXT_PAT = "<tu PAT>"
  .\devops\scripts\create-backlog.ps1 -Org "https://dev.azure.com/miorg" -Project "ArrowOps" -AssignedTo "tu@correo.com"

.NOTES
  Requiere: Azure CLI + extension azure-devops y un proyecto con proceso "Agile".
  Estimacion por tipo (proceso Agile):
    Epic / Feature -> Effort
    User Story     -> Story Points
    Task           -> Original Estimate y Remaining Work (horas)
  Todos los items nacen en estado "New"; avanzan a Active/Resolved/Closed con el trabajo.
  Los textos van sin tildes a proposito: evita problemas de codificacion al pasar
  argumentos a az.cmd desde Windows PowerShell 5.1.
#>
param(
    [Parameter(Mandatory)] [string] $Org,
    [Parameter(Mandatory)] [string] $Project,
    [Parameter(Mandatory)] [string] $AssignedTo,
    [string] $StoryType = "User Story",
    [string] $OutFile = "docs/backlog-ids.csv"
)

$ErrorActionPreference = "Stop"

az devops configure --defaults organization=$Org project=$Project
if ($LASTEXITCODE -ne 0) { throw "No se pudo configurar az devops." }

$results = New-Object System.Collections.Generic.List[object]

function New-WorkItem {
    param(
        [string] $Type, [string] $Title, [string] $Description,
        [int] $Priority, [string[]] $Fields, [int] $ParentId = 0
    )

    $allFields = @("Microsoft.VSTS.Common.Priority=$Priority") + $Fields
    $id = az boards work-item create --type $Type --title $Title --description $Description `
        --assigned-to $AssignedTo --fields $allFields --query id -o tsv
    if ($LASTEXITCODE -ne 0 -or -not $id) { throw "Fallo al crear '$Title'." }

    if ($ParentId -gt 0) {
        az boards work-item relation add --id $id --relation-type parent --target-id $ParentId -o none
        if ($LASTEXITCODE -ne 0) { throw "Fallo al enlazar $id con su padre $ParentId." }
    }

    $results.Add([pscustomobject]@{
        Id = [int]$id; Type = $Type; Title = $Title; ParentId = $ParentId
        Priority = $Priority; Estimate = ($Fields -join "; "); AssignedTo = $AssignedTo; State = "New"
    })
    Write-Host ("[{0,-10}] AB#{1}  P{2}  {3}" -f $Type, $id, $Priority, $Title)
    return [int]$id
}

# Estructura: Epic > Feature > User Story (Points) > Tasks (horas). Prioridad 1 = mas alta.
$backlog = @(
    @{ Title = "Gestion de incidentes de TI"; Priority = 1; Effort = 26
       Desc  = "Permitir a la mesa de ayuda registrar, consultar, actualizar y cerrar incidentes."
       Features = @(
           @{ Title = "API REST de incidentes"; Priority = 1; Effort = 13
              Desc  = "Backend con el CRUD de incidentes."
              Stories = @(
                  @{ Title = "Como tecnico quiero registrar un incidente para dejar constancia del problema"; Priority = 1; Points = 5
                     Tasks = @(
                         @{ Title = "Definir modelo y validaciones del incidente"; Hours = 4 },
                         @{ Title = "Implementar endpoint POST /api/incidents"; Hours = 4 }) },
                  @{ Title = "Como tecnico quiero consultar, actualizar y eliminar incidentes para darles seguimiento"; Priority = 1; Points = 8
                     Tasks = @(
                         @{ Title = "Implementar endpoints GET /api/incidents y GET /api/incidents/:id"; Hours = 4 },
                         @{ Title = "Implementar endpoints PUT y DELETE /api/incidents/:id"; Hours = 5 }) }
              ) },
           @{ Title = "Interfaz web de incidentes"; Priority = 2; Effort = 13
              Desc  = "Frontend para operar los incidentes desde el navegador."
              Stories = @(
                  @{ Title = "Como tecnico quiero ver el listado de incidentes para priorizar mi trabajo"; Priority = 2; Points = 5
                     Tasks = @(
                         @{ Title = "Crear estructura base del frontend"; Hours = 3 },
                         @{ Title = "Construir tabla de incidentes con filtro por estado"; Hours = 5 }) },
                  @{ Title = "Como tecnico quiero un formulario para crear y editar incidentes"; Priority = 2; Points = 8
                     Tasks = @(
                         @{ Title = "Construir formulario de alta y edicion"; Hours = 5 },
                         @{ Title = "Integrar el frontend con la API"; Hours = 4 }) }
              ) }
       ) },
    @{ Title = "Entrega continua y calidad"; Priority = 1; Effort = 34
       Desc  = "Automatizar build, pruebas, seguridad y release hasta v1.0.0."
       Features = @(
           @{ Title = "Integracion continua y seguridad"; Priority = 1; Effort = 18
              Desc  = "Pipelines de CI con pruebas y analisis de seguridad."
              Stories = @(
                  @{ Title = "Como equipo queremos que cada PR ejecute build y pruebas automaticamente"; Priority = 1; Points = 8
                     Tasks = @(
                         @{ Title = "Configurar azure-pipelines.yml"; Hours = 6 },
                         @{ Title = "Configurar workflow de GitHub Actions"; Hours = 3 }) },
                  @{ Title = "Como equipo queremos pruebas automatizadas y control de seguridad del codigo"; Priority = 1; Points = 10
                     Tasks = @(
                         @{ Title = "Implementar pruebas unitarias y de integracion de la API"; Hours = 6 },
                         @{ Title = "Configurar manejo de secretos y analisis de dependencias"; Hours = 4 }) }
              ) },
           @{ Title = "Estabilizacion y release"; Priority = 2; Effort = 16
              Desc  = "Agente propio, gestion de deuda tecnica y publicacion de v1.0.0 con ambientes y aprobaciones."
              Stories = @(
                  @{ Title = "Como equipo queremos un agente autohospedado y saber diagnosticar fallos del pipeline"; Priority = 2; Points = 8
                     Tasks = @(
                         @{ Title = "Instalar y registrar el agente autohospedado"; Hours = 3 },
                         @{ Title = "Provocar un fallo controlado, diagnosticarlo y corregirlo"; Hours = 3 }) },
                  @{ Title = "Como equipo queremos publicar la version v1.0.0 con ambientes y aprobaciones"; Priority = 2; Points = 8
                     Tasks = @(
                         @{ Title = "Registrar 5 deudas tecnicas y resolver 2"; Hours = 5 },
                         @{ Title = "Aplicar versionado semantico, ambientes con aprobacion y empaquetar v1.0.0"; Hours = 5 }) }
              ) }
       ) }
)

foreach ($epic in $backlog) {
    $epicId = New-WorkItem -Type "Epic" -Title $epic.Title -Description $epic.Desc -Priority $epic.Priority `
        -Fields @("Microsoft.VSTS.Scheduling.Effort=$($epic.Effort)")
    foreach ($feature in $epic.Features) {
        $featureId = New-WorkItem -Type "Feature" -Title $feature.Title -Description $feature.Desc -Priority $feature.Priority `
            -Fields @("Microsoft.VSTS.Scheduling.Effort=$($feature.Effort)") -ParentId $epicId
        foreach ($story in $feature.Stories) {
            $storyId = New-WorkItem -Type $StoryType -Title $story.Title -Description $story.Title -Priority $story.Priority `
                -Fields @("Microsoft.VSTS.Scheduling.StoryPoints=$($story.Points)") -ParentId $featureId
            foreach ($task in $story.Tasks) {
                New-WorkItem -Type "Task" -Title $task.Title -Description $task.Title -Priority $story.Priority `
                    -Fields @("Microsoft.VSTS.Scheduling.OriginalEstimate=$($task.Hours)",
                              "Microsoft.VSTS.Scheduling.RemainingWork=$($task.Hours)") `
                    -ParentId $storyId | Out-Null
            }
        }
    }
}

$results | Export-Csv -Path $OutFile -NoTypeInformation -Encoding UTF8
Write-Host ""
$results | Group-Object Type | ForEach-Object { Write-Host ("{0}: {1}" -f $_.Name, $_.Count) }
Write-Host "IDs guardados en $OutFile"
