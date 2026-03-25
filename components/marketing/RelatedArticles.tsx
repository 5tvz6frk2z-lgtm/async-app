import Link from 'next/link';

interface RelatedArticle {
    href: string;
    label: string;
    title: string;
}

interface RelatedArticlesProps {
    articles: RelatedArticle[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
    return (
        <div className="mt-16 not-prose">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Related Articles</h3>
            <div className="grid sm:grid-cols-2 gap-4">
                {articles.map((article) => (
                    <Link
                        key={article.href}
                        href={article.href}
                        className="block p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                    >
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{article.label}</span>
                        <p className="mt-1.5 font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors text-sm leading-snug">{article.title}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
