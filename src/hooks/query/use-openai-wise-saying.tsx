import { openai } from "@_utils/openai";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useOpenaiChatCompletions = () => {
  return useQuery({
    queryKey: ["openai-wise-saying"],
    queryFn: () => {
      const completion = openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: "프로그래밍과 관련된 명언 하나를 랜덤으로 알려주세요.",
          },
        ],
        model: "gpt-3.5-turbo",
      });

      return completion;
    },
  });
};

export type OpenaiWiseSayingResponse = {};
