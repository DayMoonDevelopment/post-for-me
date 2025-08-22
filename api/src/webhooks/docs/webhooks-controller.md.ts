export const webhookControllerDescription = `
Webhooks enable you to subscribe to certain events. This involves Post for Me making a POST request to the URL of any webhooks you create.
Only the events you subscribe to will be sent to your webhook URL.

## Payload
When an event happens that your webhook is subscribed to, we will make a POST request with the following JSON body

\`\`\`
    {
        "event_type": "",
        "data": {}
    }
\`\`\`

The event_type will be the event that triggered the webhook POST, data will be the resulting entity from the event

## Security
To verify the POST to your webhook URL is from us we will include a secret in the header "Post-For-Me-Webhook-Secret".
When you create a webhook you will receive the secret in the response.

## Retries
If your server fails to respond with a 2XX code, requests to it will be retried with exponential backoff around 8 times over the course of just over a day.

`;
