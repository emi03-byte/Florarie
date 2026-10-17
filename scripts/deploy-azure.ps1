# Deploy Florarie to Azure (student-friendly basics)
# Prerequisites: az login already done

$ErrorActionPreference = "Stop"

$ResourceGroup = "rg-florarie"
$Location = "westeurope"
$SqlServer = "florarie-sql-$(Get-Random -Maximum 99999)"
$SqlDb = "florarie"
$SqlAdmin = "florarieadmin"
$AppName = "florarie-api-$(Get-Random -Maximum 99999)"
$PlanName = "plan-florarie"
$StaticAppName = "florarie-web"

# Generate secrets
$AppPassword = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 12 | ForEach-Object { [char]$_ })
$JwtSecret = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
$SqlPassword = "Fl!" + (-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 12 | ForEach-Object { [char]$_ })) + "a1"

Write-Host "==> Subscription"
az account show --query "{name:name, id:id}" -o table

Write-Host "==> Resource group $ResourceGroup"
az group create --name $ResourceGroup --location $Location | Out-Null

Write-Host "==> Azure SQL server $SqlServer (this can take a few minutes)"
az sql server create `
  --name $SqlServer `
  --resource-group $ResourceGroup `
  --location $Location `
  --admin-user $SqlAdmin `
  --admin-password $SqlPassword | Out-Null

az sql server firewall-rule create `
  --resource-group $ResourceGroup `
  --server $SqlServer `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0 | Out-Null

Write-Host "==> SQL database $SqlDb (Basic)"
az sql db create `
  --resource-group $ResourceGroup `
  --server $SqlServer `
  --name $SqlDb `
  --service-objective Basic `
  --backup-storage-redundancy Local | Out-Null

$SqlConn = "Server=tcp:$SqlServer.database.windows.net,1433;Initial Catalog=$SqlDb;Persist Security Info=False;User ID=$SqlAdmin;Password=$SqlPassword;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

Write-Host "==> App Service plan + Web App"
az appservice plan create `
  --name $PlanName `
  --resource-group $ResourceGroup `
  --sku B1 `
  --is-linux | Out-Null

az webapp create `
  --resource-group $ResourceGroup `
  --plan $PlanName `
  --name $AppName `
  --runtime "NODE:20-lts" | Out-Null

az webapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $AppName `
  --settings `
    APP_PASSWORD="$AppPassword" `
    JWT_SECRET="$JwtSecret" `
    SQL_CONNECTION_STRING="$SqlConn" `
    SCM_DO_BUILD_DURING_DEPLOYMENT=true | Out-Null

az webapp config set `
  --resource-group $ResourceGroup `
  --name $AppName `
  --startup-file "npm start" | Out-Null

Write-Host "==> Deploy API from server/"
Push-Location (Join-Path $PSScriptRoot "..\server")
if (Test-Path deploy.zip) { Remove-Item deploy.zip -Force }
# zip contents for Azure (package.json at root of zip)
Compress-Archive -Path * -DestinationPath deploy.zip -Force
az webapp deployment source config-zip `
  --resource-group $ResourceGroup `
  --name $AppName `
  --src deploy.zip | Out-Null
Remove-Item deploy.zip -Force
Pop-Location

$ApiUrl = "https://$AppName.azurewebsites.net"
Write-Host "==> API URL: $ApiUrl"

Write-Host @"

========================================
SALVEAZA ACESTE DATE (nu le pierde):
========================================
Resource group:     $ResourceGroup
API URL:            $ApiUrl
Parola aplicatie:   $AppPassword
SQL server:         $SqlServer.database.windows.net
SQL admin:          $SqlAdmin
SQL password:       $SqlPassword

Urmatorul pas FRONTEND:
1. In Azure Portal: Create Static Web App
2. Conecteaza repo GitHub emi03-byte/Florarie
3. App location: /
   Output location: dist
4. Adauga Application setting:
   VITE_API_URL = $ApiUrl
5. Dupa ce ai URL-ul Static Web App, ruleaza:

az webapp config appsettings set -g $ResourceGroup -n $AppName --settings CORS_ORIGIN="https://YOUR-STATIC-APP.azurestaticapps.net"

========================================
"@
