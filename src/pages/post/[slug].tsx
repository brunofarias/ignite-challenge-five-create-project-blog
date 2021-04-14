import { useEffect, useRef } from 'react';

import next, { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string | null;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  pagination: {
    nextPage: {
      href: string;
      title: string;
    };
    prevPage: {
      href: string;
      title: string;
    };
  };
}

export default function Post({
  post,
  preview,
  pagination,
}: PostProps): JSX.Element {
  const router = useRouter();

  const commentsSection = useRef<HTMLDivElement>();

  const totalWords = post?.data?.content.reduce((total, content) => {
    if (content.heading) {
      total.push(...content.heading.split(' '));
    }

    const wordsContent = RichText.asText(content.body).split(' ');

    total.push(...wordsContent);

    return total;
  }, []);

  const readTime = Math.ceil(totalWords?.length / 200);

  useEffect(() => {
    const hasScript = commentsSection?.current.querySelector('.utterances');

    if (hasScript) {
      hasScript.remove();
    }

    const utteranceScript = document.createElement('script');

    utteranceScript.setAttribute('src', 'https://utteranc.es/client.js');
    utteranceScript.setAttribute('crossorigin', 'anonymous');
    utteranceScript.setAttribute('async', 'true');
    utteranceScript.setAttribute(
      'repo',
      'brunofarias/ignite-challenge-five-create-project-blog'
    );
    utteranceScript.setAttribute('issue-term', 'pathname');
    utteranceScript.setAttribute('theme', 'github-dark');

    commentsSection.current?.appendChild(utteranceScript);
  }, [post]);

  return (
    <>
      <Head>
        <title>
          {post?.data?.title
            ? `${post?.data?.title} | SpaceTraveling`
            : 'SpaceTraveling'}
        </title>
      </Head>

      <Header />

      <main>
        <article className={styles.post}>
          <img src={post?.data?.banner.url} alt={post?.data?.banner.url} />

          <div className={commonStyles.container}>
            <header>
              {router.isFallback && (
                <strong className={commonStyles.loading}>Carregando...</strong>
              )}

              <h1>{post?.data?.title}</h1>

              <div className={commonStyles.postInfo}>
                <time>
                  <FiCalendar size="20px" />
                  {post?.first_publication_date
                    ? format(
                        new Date(post.first_publication_date),
                        'dd MMM yyyy',
                        { locale: ptBR }
                      )
                    : 'Data de publicação'}
                </time>
                <span>
                  <FiUser size="20px" />
                  {post?.data?.author ?? 'Autor'}
                </span>
                <span>
                  <FiClock size="20px" />
                  {readTime ? `${readTime} min` : 'Tempo de leitura'}
                </span>
                {post?.last_publication_date && (
                  <span className={commonStyles.lastEdit}>
                    {format(
                      new Date(post.last_publication_date),
                      "'* editado em 'dd MMM yyyy', às' HH:mm",
                      { locale: ptBR }
                    )}
                  </span>
                )}
              </div>
            </header>

            <main>
              {post?.data?.content.map(content => (
                <div key={content.heading} className={styles.postContent}>
                  <h2>{content.heading}</h2>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: RichText.asHtml(content.body),
                    }}
                  />
                </div>
              ))}
            </main>

            <footer>
              {pagination && (
                <section className={styles.pagination}>
                  {pagination?.prevPage && (
                    <span>
                      {pagination.prevPage.title}
                      <Link href={pagination.prevPage.href}>
                        <a>Post Anterior</a>
                      </Link>
                    </span>
                  )}

                  {pagination?.nextPage && (
                    <span className={styles.nextPost}>
                      {pagination.nextPage.title}
                      <Link href={pagination.nextPage.href}>
                        <a>Próximo Post</a>
                      </Link>
                    </span>
                  )}
                </section>
              )}

              <section ref={commentsSection} />

              {preview && (
                <aside className={styles.aside}>
                  <Link href="/api/exit-preview">
                    <a>Sair do modo Preview</a>
                  </Link>
                </aside>
              )}
            </footer>
          </div>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      orderings: '[document.first_publication_date desc]',
      pageSize: 2,
    }
  );

  const paths = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const {
    results: [nextPage],
  } = await prismic.query([Prismic.predicates.at('document.type', 'posts')], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date]',
  });

  const {
    results: [prevPage],
  } = await prismic.query([Prismic.predicates.at('document.type', 'posts')], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date desc]',
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date:
      response.first_publication_date !== response.last_publication_date
        ? response.last_publication_date
        : null,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content,
    },
  };

  const pagination = {
    nextPage: nextPage
      ? {
          title: nextPage?.data.title,
          href: `/post/${nextPage?.uid}`,
        }
      : null,
    prevPage: prevPage
      ? {
          title: prevPage.data.title,
          href: `/post/${prevPage.uid}`,
        }
      : null,
  };

  return {
    props: {
      post,
      preview,
      pagination,
    },
    redirect: 60 * 30,
  };
};
