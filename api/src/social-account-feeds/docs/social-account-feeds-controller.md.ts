export const socialAccountFeedsControllerDescription = `
The social account feed is every post made for the social account, including posts not made through our API. 
Use this endpoint to get the platform details for any post made under the connected account. To use this endpoint accounts must be connected with the **"feeds" permission**. 

Details will include: 
 - Post information including caption, url, media, etc.. 
 - When passing **expand=metrics**, Metrics information including views, likes, follows, etc..

Note: Currently only the following platforms are supported **Instagram**, **TikTok**, **TikTok Business**, **Youtube**
`;
