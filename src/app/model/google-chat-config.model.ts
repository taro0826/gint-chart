interface GoogleChatMember {
    gitlabToken: string;
    googleChatUserId: string;
}

export interface GoogleChatConfig {
  projectId: number;
  googleChatWebhookUrl: string;
  member: GoogleChatMember[];
}