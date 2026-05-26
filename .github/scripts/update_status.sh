#!/bin/bash

PRECHECK=$1
SUPABASE=$2
TRIGGER=$3
API_RAILWAY=$4
API_UNKEY=$5
DASHBOARD_UNKEY=$6
DASHBOARD_VERCEL=$7
MARKETING_UNKEY=$8
MARKETING_VERCEL=$9

DASHBOARD_URL="https://post-for-me-app.vercel.app/"

# Table block (monospaced layout)
BLOCK=$(cat <<EOF
\`\`\`
Step                 | Status
---------------------|--------
Precheck             | ${PRECHECK}
Supabase             | ${SUPABASE}
Trigger.dev          | ${TRIGGER}
API (Railway)        | ${API_RAILWAY}
API (Unkey)          | ${API_UNKEY}
Dashboard (Unkey)    | ${DASHBOARD_UNKEY}
Dashboard (Vercel)   | ${DASHBOARD_VERCEL}
Marketing (Unkey)    | ${MARKETING_UNKEY}
Marketing (Vercel)   | ${MARKETING_VERCEL}
\`\`\`
EOF
)

# Message content
HEADER_TEXT="*Deploying to production*"
LINK_BLOCK="🌐 <$DASHBOARD_URL|Live Dashboard ↗>"

# Post or update the Slack message
if [[ -z "$SLACK_TS" ]]; then
  response=$(curl -s -X POST -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
    -H "Content-type: application/json" \
    --data "{
      \"channel\": \"$SLACK_CHANNEL\",
      \"text\": \"Deploying to production\",
      \"blocks\": [
        {
          \"type\": \"section\",
          \"text\": { \"type\": \"mrkdwn\", \"text\": \"$HEADER_TEXT\n\n$BLOCK\" }
        },
        {
          \"type\": \"context\",
          \"elements\": [
            { \"type\": \"mrkdwn\", \"text\": \"$LINK_BLOCK\" }
          ]
        }
      ]
    }" https://slack.com/api/chat.postMessage)

  export SLACK_TS=$(echo "$response" | jq -r .ts)
  export SLACK_CHANNEL_ID=$(echo "$response" | jq -r .channel)

  echo "SLACK_TS=$SLACK_TS" >> "$GITHUB_ENV"
  echo "SLACK_CHANNEL_ID=$SLACK_CHANNEL_ID" >> "$GITHUB_ENV"

else
  curl -s -X POST -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
    -H "Content-type: application/json" \
    --data "{
      \"channel\": \"$SLACK_CHANNEL_ID\",
      \"ts\": \"$SLACK_TS\",
      \"text\": \"Deploying to production\",
      \"blocks\": [
        {
          \"type\": \"section\",
          \"text\": { \"type\": \"mrkdwn\", \"text\": \"$HEADER_TEXT\n\n$BLOCK\" }
        },
        {
          \"type\": \"context\",
          \"elements\": [
            { \"type\": \"mrkdwn\", \"text\": \"$LINK_BLOCK\" }
          ]
        }
      ]
    }" https://slack.com/api/chat.update > /dev/null
fi
