import * as React from "react";
import { Link, HeadFC, PageProps } from "gatsby";
import { Icon } from "@iconify/react";
import { SEOComponent } from "@_components";

const NotFoundPage: React.FC<PageProps> = () => {
  return (
    <main className="w-full min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        {/* 404 number */}
        <div className="relative mb-8">
          <p className="font-maple text-[8rem] leading-none text-border select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon icon="lucide:file-question" width={64} className="text-muted-foreground/40" />
          </div>
        </div>

        {/* Message */}
        <h1 className="font-maple text-2xl text-foreground mb-3">
          페이지를 찾을 수 없어요
        </h1>
        <p className="font-sans text-sm text-muted-foreground mb-8 leading-relaxed">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          <br />
          URL을 다시 확인하거나 홈으로 돌아가 주세요.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-opacity no-underline"
          >
            <Icon icon="lucide:home" width={16} />
            홈으로
          </Link>
          <Link
            to="/posts/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border text-foreground font-sans text-sm font-medium hover:bg-accent transition-colors no-underline"
          >
            <Icon icon="lucide:book-open" width={16} />
            포스트 목록
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFoundPage;

export const Head: HeadFC = () => <SEOComponent title="404 - 페이지를 찾을 수 없음" />;
