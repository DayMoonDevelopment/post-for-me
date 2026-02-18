export const socialAccountFeedsControllerDescription = `
The social account feed is every post made for the social account, including posts not made through our API. 
Use this endpoint to get the platform details for any post made under the connected account. To use this endpoint accounts must be connected with the **"feeds" permission**. 

Details will include: 
 - Post information including caption, url, media, etc.. 
 - When passing **expand=metrics**, Metrics information including views, likes, follows, etc..

Note: Currently the following platforms are supported: 
 - **Instagram**, may take up to 48 hours for some metrics to be avaialbe 
 - **Facebook** 
 - **TikTok**, consumer API exposes less analytics for more details connect through TikTok Business
 - **TikTok Business**, 
 - **Youtube**
 - **Threads**
 - **X (Twitter)**
 - **Bluesky**, Bluesky does not expose views or impressions through their API.
 - **Pinterest**
 - **LinkedIn**, metrics are only available for company pages. LinkedIn has currently stopped giving permission for personal page analytics, we are on the waitlist for when they resume.
`;
