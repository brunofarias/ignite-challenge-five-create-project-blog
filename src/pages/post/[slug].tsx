import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router'
import Head from 'next/head';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Header from '../../components/Header';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post }: PostProps) {
  const router = useRouter()

  const totalWords = post?.data?.content.reduce((total, content) => {

    if (!!content.heading) {
      total.push(...content.heading.split(' '))
    }

    const wordsContent = RichText.asText(content.body).split(' ');

    total.push(...wordsContent);

    return total;

  }, []);

  const readTime = Math.ceil(totalWords?.length / 200);

  return (
    <>
      <Head>
        <title>
          {post?.data?.title
            ? `${post?.data?.title} | SpaceTraveling`
            : 'SpaceTraveling'
          }
        </title>
      </Head>

      <Header />

      <main>

        <article className={styles.post}>
          <img src={post?.data?.banner.url} alt={post?.data?.banner.url} />

          <div className={commonStyles.container}>
            <header>

              {router.isFallback && <strong className={commonStyles.loading}>Carregando...</strong>}

              <h1>{post?.data?.title}</h1>

              <div className={commonStyles.postInfo}>
                <time>
                  <FiCalendar size="20px" />
                  <span>
                    {post?.first_publication_date
                      ? format(new Date(post.first_publication_date), 'dd MMM yyyy', { locale: ptBR })
                      : 'Data de publicação'
                    }
                  </span>
                </time>
                <div>
                  <FiUser size="20px" />
                  <span>{post?.data?.author ?? 'Autor'}</span>
                </div>
                <div>
                  <FiClock size="20px" />
                  <span>{readTime ? `${readTime} min` : 'Tempo de leitura'}</span>
                </div>
              </div>
            </header>

            <main>
              {post?.data?.content.map(content => (
                <div key={content.heading} className={styles.postContent}>
                  <h2>{content.heading}</h2>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: RichText.asHtml(content.body)
                    }}
                  />
                </div>
              ))}
            </main>
          </div>
        </article>

      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')],
    {
      orderings: '[document.first_publication_date desc]',
      pageSize: 2
    }
  );

  const paths = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));

  return {
    paths,
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();

  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content
    }
  }

  return {
    props: {
      post
    },
    redirect: 60 * 30,
  }
};
