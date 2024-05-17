import { useGithubUsersDetail } from "./use-github-users-detail";

export const useGithubMyInfo = () => {
  const nickname = process.env.GATSBY_GITHUB_USERNAME ?? "";
  const { data } = useGithubUsersDetail({
    slug: {
      nickname,
    },
  });

  return nickname === undefined ? undefined : data?.data;
};
