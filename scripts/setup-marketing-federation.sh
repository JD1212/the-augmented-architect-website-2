#!/usr/bin/env bash
# Review, then run in Google Cloud Shell. No keys are created; no org policies change.
# Stops if the dedicated pool already exists rather than overwriting infrastructure.
set -euo pipefail
marketing_project='the-augmented-architect-web'
marketing_number='68454656491'
marketing_account='marketing-intelligence-reader@the-augmented-architect-web.iam.gserviceaccount.com'
marketing_pool='augarch-marketing'
marketing_provider='vercel'

test "$(gcloud projects describe "$marketing_project" --format='value(projectNumber)')" = "$marketing_number"
gcloud iam service-accounts describe "$marketing_account" --project="$marketing_project" --format='value(email)'
if gcloud iam workload-identity-pools describe "$marketing_pool" --location=global --project="$marketing_project" >/dev/null 2>&1; then
  echo 'The dedicated pool already exists. Stop and review its configuration before continuing.' >&2
  exit 1
fi

gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project="$marketing_project"
gcloud iam workload-identity-pools create "$marketing_pool" --location=global --project="$marketing_project" --display-name='Augarch Marketing (Vercel)'
gcloud iam workload-identity-pools providers create-oidc "$marketing_provider" \
  --project="$marketing_project" --location=global --workload-identity-pool="$marketing_pool" \
  --display-name='Website marketing reader' \
  --issuer-uri='https://oidc.vercel.com/jd-burkholders-projects' \
  --allowed-audiences='https://vercel.com/jd-burkholders-projects' \
  --attribute-mapping='google.subject=assertion.sub,attribute.owner_id=assertion.owner_id,attribute.project_id=assertion.project_id,attribute.environment=assertion.environment' \
  --attribute-condition="assertion.owner_id == 'team_gIBiazQzKNJ8DmNLOuAfpecs' && assertion.project_id == 'prj_mSGGBQyKYm20H8Rl57tjm72qCQHq' && assertion.environment in ['production','preview','development']"

# Exact subjects, not a wildcard trust of the team, pool or every preview project.
for marketing_environment in production preview development; do
  gcloud iam service-accounts add-iam-policy-binding "$marketing_account" \
    --project="$marketing_project" --role='roles/iam.workloadIdentityUser' --condition=None \
    --member="principal://iam.googleapis.com/projects/$marketing_number/locations/global/workloadIdentityPools/$marketing_pool/subject/owner:jd-burkholders-projects:project:the-augmented-architect-website-2:environment:$marketing_environment" \
    --format='none'
done

gcloud iam workload-identity-pools providers describe "$marketing_provider" \
  --project="$marketing_project" --location=global --workload-identity-pool="$marketing_pool" \
  --format='yaml(name,state,oidc.issuerUri,oidc.allowedAudiences,attributeMapping,attributeCondition)'
echo 'Federation configured. No service-account key or organization-policy exception was created.'
