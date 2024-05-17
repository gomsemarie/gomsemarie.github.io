import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useGithubUsersDetail = ({
  slug: { nickname },
}: GithubUserDetailPayload) => {
  const apiUrl = process.env.GATSBY_GITHUB_API_URL;
  return useQuery({
    queryKey: ["github-users-detail", nickname],
    queryFn: () => {
      return axios.get<GithubUserDetailResponse>(`${apiUrl}/users/${nickname}`);
    },
  });
};

export type GithubUserDetailPayload = {
  slug: {
    nickname: string;
  };
};

export type GithubUserDetailResponse = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string;
  hireable: boolean;
  bio: string;
  twitter_username: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
};
