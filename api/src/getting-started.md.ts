export const gettingStartedDescription = `
The official API for [Post for Me](https://www.postforme.dev/)

## Auth
Authentication is required for all endpoints. Provide a valid API key as a Bearer token in the Authorization header. 
Log in to your [Post for Me](https://www.postforme.dev/) account to retrieve your API key.

## Getting Started
To create a post you first need to get the social accounts you want to post to, upload any media for the post (if applicable), and then create the post. 

The below example shows how to create a media post from start to finish.

**Example flow using JavaScript and the Fetch API:**

**Connect an Account**

 You can skip this step if you have accounts connected already, or are connecting accounts through the [dashboard](https://app.postforme.dev/)
\`\`\`js
   //Create an auth URL to redirect the user to in order for them to login and connect their account
   const socialAccountAuthUrlResponse = await fetch('https://api.postforme.dev/v1/social-accounts/auth-url', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer YOUR_API_KEY'
     },
     body: JSON.stringify({
         platform: 'facebook'
       }),
   });

   const { url } = await socialAccountAuthUrlResponse.json();

   //Redirect to the url from the repsone
   console.log(url);
   \`\`\`

**Get Social Accounts**

  \`\`\`js
   // Step 1: Fetch the social accounts you want to post to. In this case we are getting all facebook and instagram accounts.
   const socialAccountResponse = await fetch('https://api.postforme.app/v1/social-accounts?platform=facebook&platform=instagram', {
     method: 'GET',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer YOUR_API_KEY'
     }
   });

   const { data } = await socialAccountResponse.json();

   //Grab the ids from the social account response
   const accountIds =  data.map((account) => account.id);
   \`\`\`


**Create the post**

 \`\`\`js
   // Step 2: Create the post using the social account ids

   // We are scheduling the post one hour from now
   const scheduledAt = new Date();
   scheduledAt.setHours(scheduledAt.getHours() + 1);

   const postResponse = await fetch('https://api.postforme.dev/v1/social-posts', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': 'Bearer YOUR_API_KEY'
       },
       body: JSON.stringify({
         caption: 'Hello, world!',
         scheduled_at: scheduledAt,
         media: [
          {
            "url": "https://picsum.photos/id/237/1080/1080",
          }
        ],
         social_accounts: accountIds,
       }),
     });
   
     const postData = await postResponse.json();
   \`\`\`

**Thats It! You have successfully scheduled a post to go out in one hour.** 

## Client Libraries

Follow the links below for our official libraries: 

[TypeScript](https://www.npmjs.com/package/post-for-me)

[Python](https://pypi.org/project/post-for-me/)

[Ruby](https://rubygems.org/gems/post-for-me)

[Go](https://pkg.go.dev/github.com/DayMoonDevelopment/post-for-me-go)


## MCP

We provide an MCP (Model Context Protocol) server that allows AI assistants to interact with Post for Me directly. Currently you must run the MCP server locally to use it with your AI assistant.

[MCP Server Documentation](https://www.npmjs.com/package/post-for-me-mcp)

`;
