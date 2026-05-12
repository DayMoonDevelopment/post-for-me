import { useState } from "react";

import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockItem,
} from "~/components/code-block";
import { GoLogo } from "~/components/go-logo";
import { KotlinLogo } from "~/components/kotlin-logo";
import { NodeJSLogo } from "~/components/nodejs-logo";
import { PythonLogo } from "~/components/python-logo";
import { RubyLogo } from "~/components/ruby-logo";
import { TypescriptLogo } from "~/components/typescript-logo";

import { ToggleGroup, ToggleGroupItem } from "~/ui/toggle-group";

import type { BundledLanguage } from "~/components/code-block";

const code = [
  {
    language: "javascript",
    filename: "index.js",
    code: `// Simple fetch API example
const response = await fetch('https://api.postforme.dev/social-posts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    caption: 'My first post!',
    social_accounts: ['sa_1234'],
    media: [{ url: 'https://picsum.photos/1080' }]
  })
});

const socialPost = await response.json();
console.log(socialPost.id);`,
  },
  {
    language: "typescript",
    filename: "index.ts",
    code: `import PostForMe from 'post-for-me';

const client = new PostForMe({
  apiKey: process.env['POST_FOR_ME_API_KEY'], // This is the default and can be omitted
});

const socialPost = await client.socialPosts.create({
  caption: 'My first post!',
  social_accounts: ['sa_1234'],
  media: [{ url: 'https://picsum.photos/1080' }],
});

console.log(socialPost.id);`,
  },
  {
    language: "python",
    filename: "main.py",
    code: `import os
from post_for_me import PostForMe

client = PostForMe(
  api_key=os.environ.get("POST_FOR_ME_API_KEY"), # This is the default and can be omitted
)

social_post = client.social_posts.create(
  caption="My first post!",
  social_accounts=["sa_1234"],
  media=[{ "url": "https://picsum.photos/1080" }],
)
print(social_post.id)`,
  },
  {
    language: "ruby",
    filename: "main.rb",
    code: `require "bundler/setup"
require "post_for_me"

post_for_me = PostForMe::Client.new(
  api_key: ENV["POST_FOR_ME_API_KEY"] # This is the default and can be omitted
)

social_post = post_for_me.social_posts.create(
  caption: "My first post!",
  social_accounts: ["sa_1234"],
  media: [{ url: "https://picsum.photos/1080" }]
)

puts(social_post.id)`,
  },
  {
    language: "go",
    filename: "main.go",
    code: `package main

import (
	"context"
	"fmt"

	"github.com/DayMoonDevelopment/post-for-me-go"
	"github.com/DayMoonDevelopment/post-for-me-go/option"
)

func main() {
	client := postforme.NewClient(
		option.WithAPIKey("My API Key"), // defaults to os.LookupEnv("POST_FOR_ME_API_KEY")
	)
	socialPost, err := client.SocialPosts.New(context.TODO(), postforme.SocialPostNewParams{
		CreateSocialPost: postforme.CreateSocialPostParam{
			Caption: "My first post!",
			SocialAccounts: []string{"sa_1234"},
		},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\\n", socialPost.ID)
}`,
  },
];

const languageIcons = {
  javascript: NodeJSLogo,
  typescript: TypescriptLogo,
  python: PythonLogo,
  ruby: RubyLogo,
  go: GoLogo,
  kotlin: KotlinLogo,
};

export function CodeSamples() {
  const [language, setLanguage] = useState(code[0].language);

  return (
    <div className="w-full min-w-0 relative flex flex-col gap-4">
      <div className="w-full overflow-x-auto scrollbar-hidden">
        <ToggleGroup
          value={language}
          type="single"
          onValueChange={setLanguage}
          className="flex-nowrap min-w-max"
        >
          {code.map((item) => {
            const IconComponent =
              languageIcons[item.language as keyof typeof languageIcons];
            return (
              <ToggleGroupItem
                key={item.language}
                value={item.language}
                className="flex items-center gap-2"
              >
                <IconComponent className="w-5 h-5" />
                {item.language.charAt(0).toUpperCase() + item.language.slice(1)}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      <CodeBlock data={code} value={language} className="flex-1 min-w-0">
        <CodeBlockBody>
          {(item) => (
            <CodeBlockItem key={item.language} value={item.language}>
              <CodeBlockContent language={item.language as BundledLanguage}>
                {item.code}
              </CodeBlockContent>
            </CodeBlockItem>
          )}
        </CodeBlockBody>
      </CodeBlock>
    </div>
  );
}