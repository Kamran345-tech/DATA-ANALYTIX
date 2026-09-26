import React, { useState } from 'react';
import { 
  Newspaper, 
  Search, 
  BookOpen, 
  ArrowRight, 
  Tag, 
  Clock, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  excerpt: string;
  content: string;
  date: string;
}

const articles: BlogPost[] = [
  {
    id: 'post-1',
    title: 'Transforming Flat Denormalized Spreadsheets into Enterprise Star Schemas',
    slug: 'flat-files-to-star-schema',
    category: 'Data Modeling',
    readTime: '6 min read',
    date: 'March 2025',
    excerpt: 'Why flat reporting files cause performance bottlenecks in analytical engines, and how automated primary-foreign key inference builds star schemas for Power BI.',
    content: `When business analysts receive transaction exports from ERP or CRM systems, they almost always arrive as single wide, denormalized sheets. While convenient for human eye scanning, wide tables cripple analytical performance and lead to ambiguous filtering paths.

In a Star Schema, we separate transactional events into a central Fact Table (FactSales) housing numeric measures (Revenue, Cost, Units), surrounded by Dimension Tables (DimCustomer, DimProduct, DimDate) containing discrete entity attributes.

Key benefits of Star Schema modeling:
1. 1:N Relationship Integrity: Eliminates many-to-many relationship ambiguities.
2. Fast In-Memory Scans: Columnar storage compression operates at peak efficiency.
3. Accurate DAX Measures: Context transitions in CALCULATE() evaluate cleanly.`
  },
  {
    id: 'post-2',
    title: 'Automated DAX Time Intelligence: YTD, MoM, and YoY Best Practices',
    slug: 'automated-dax-time-intelligence',
    category: 'Power BI & DAX',
    readTime: '5 min read',
    date: 'March 2025',
    excerpt: 'Deep dive into TOTALYTD, SAMEPERIODLASTYEAR, and DIVIDE variance calculations built dynamically from your schema.',
    content: `DAX (Data Analysis Expressions) is the calculation backbone of Power BI and Analysis Services Tabular models. Unlike standard spreadsheet formulas that reference cell coordinates (e.g. A1 + B1), DAX operates strictly on filter contexts and tables.

To evaluate Year-over-Year (YoY) variance reliably, your model must establish a contiguous Date dimension linked via a 1:N relationship to the Fact table.

Example Pattern:
Total Revenue = SUM('FactSales'[Revenue])
Total Revenue PY = CALCULATE([Total Revenue], SAMEPERIODLASTYEAR('DimDate'[Date]))
Revenue YoY % = VAR Cur = [Total Revenue] VAR Prior = [Total Revenue PY] RETURN DIVIDE(Cur - Prior, Prior, 0)`
  },
  {
    id: 'post-3',
    title: 'Data Quality Auditing: Why Missingness and Uniqueness Matter Before AI',
    slug: 'data-quality-before-ai',
    category: 'Data Governance',
    readTime: '4 min read',
    date: 'February 2025',
    excerpt: 'Never feed unvetted numbers to language models. The 4-pillar data quality score: Completeness, Uniqueness, Validity, and Consistency.',
    content: `Artificial intelligence can summarize trends, but it must never be the primary calculation engine. If an underlying column suffers from missing values, mixed units, or duplicate rows, generating metrics through prompt engineering produces fatal hallucinations.

NexusBI enforces a four-pillar data quality audit prior to report compilation:
1. Completeness: Percentage of non-null cells across dimensions.
2. Uniqueness: Detection of duplicate rows and primary key uniqueness.
3. Validity: Type casting compliance and IQR outlier identification.
4. Consistency: Standardization of casing and formatting.`
  }
];

export const BlogView: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [search, setSearch] = useState('');

  const filtered = articles.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Newspaper className="w-4 h-4" /> SEO & Knowledge Base
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            BI ENGINEERING & DATA SCIENCE ARTICLES
          </h1>
          <p className="text-xs text-gray-400">
            Architectural guides on Power BI automation, star schema modeling, reproducible Python data science, and deterministic AI grounding.
          </p>
        </div>
      </div>

      {selectedPost ? (
        /* Reading Post */
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-8 space-y-6">
          <button
            onClick={() => setSelectedPost(null)}
            className="text-xs text-[#21F1A8] hover:underline flex items-center gap-1 font-semibold"
          >
            ← Back to Articles
          </button>

          <div className="space-y-2 border-b border-[#282828] pb-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-[#242424] text-[#21F1A8] font-bold uppercase">{selectedPost.category}</span>
              <span>• {selectedPost.readTime}</span>
              <span>• {selectedPost.date}</span>
            </div>
            <h2 className="font-heading text-3xl font-bold text-white uppercase">{selectedPost.title}</h2>
          </div>

          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans space-y-4">
            {selectedPost.content}
          </div>
        </div>
      ) : (
        /* Articles List */
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search knowledge base articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1c1c1c] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filtered.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-3 cursor-pointer hover:border-[#21F1A8]/50 transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-[#222] text-[#21F1A8] font-semibold uppercase">{post.category}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
                </div>

                <h3 className="font-heading text-xl font-bold text-white group-hover:text-[#21F1A8] transition-colors uppercase">
                  {post.title}
                </h3>

                <p className="text-xs text-gray-400 leading-relaxed">
                  {post.excerpt}
                </p>

                <div className="pt-2 flex items-center gap-1 text-xs text-[#21F1A8] font-semibold">
                  <span>Read Article</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
