"""Tests for core/graph_engine.py."""

import networkx as nx
from pathlib import Path

from core.graph_engine import (
    PageMeta,
    parse_frontmatter,
    parse_wikilinks,
    parse_page,
    scan_wiki,
    build_graph,
    get_backlinks,
    get_wikilinks,
    find_orphans,
    find_dead_links,
    find_paths,
    graph_stats,
    hub_pages,
    impact_analysis,
)


# ---------------------------------------------------------------------------
# Sample markdown
# ---------------------------------------------------------------------------

SAMPLE_PAGE = """---
title: "Transformer"
page_type: "entity"
status: "active"
relates_to:
  - page: "Attention"
    rel: "extends"
  - page: "BERT"
    rel: "references"
---

The Transformer architecture uses [[Attention]] mechanisms. See also [[BERT]] and [[GPT]].
"""

SAMPLE_PAGE_2 = """---
title: "Attention"
page_type: "concept"
status: "active"
---

Attention is a mechanism used in [[Transformer]] and [[BERT]].
"""

SAMPLE_PAGE_3 = """---
title: "Orphan"
page_type: "concept"
status: "draft"
---

This page links to [[Transformer]] but nothing links back.
"""


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------


class TestParseFrontmatter:
    def test_valid_frontmatter(self):
        fm = parse_frontmatter(SAMPLE_PAGE)
        assert fm["title"] == "Transformer"
        assert fm["page_type"] == "entity"
        assert len(fm["relates_to"]) == 2

    def test_no_frontmatter(self):
        fm = parse_frontmatter("# No frontmatter\n\nJust content.")
        assert fm == {}

    def test_invalid_yaml(self):
        content = "---\n{{invalid yaml!!!\n---\n\nbody"
        fm = parse_frontmatter(content)
        assert fm == {}


class TestParseWikilinks:
    def test_simple_links(self):
        links = parse_wikilinks("See [[Attention]] and [[BERT]].")
        assert links == ["Attention", "BERT"]

    def test_with_aliases(self):
        links = parse_wikilinks("[[Attention|attn]] and [[BERT|bert model]]")
        assert links == ["Attention", "BERT"]

    def test_no_links(self):
        links = parse_wikilinks("No wikilinks here.")
        assert links == []


class TestParsePage:
    def test_parse_full_page(self, temp_dir):
        fp = temp_dir / "transformer.md"
        fp.write_text(SAMPLE_PAGE, encoding="utf-8")
        meta = parse_page(fp)
        assert meta.title == "Transformer"
        assert meta.page_type == "entity"
        assert meta.status == "active"
        assert "Attention" in meta.wikilinks
        assert "BERT" in meta.wikilinks
        assert len(meta.relations) == 2


class TestBuildGraph:
    def make_pages(self, temp_dir) -> list[PageMeta]:
        pages_data = [
            ("transformer.md", SAMPLE_PAGE),
            ("attention.md", SAMPLE_PAGE_2),
            ("orphan.md", SAMPLE_PAGE_3),
        ]
        pages = []
        for fname, content in pages_data:
            fp = temp_dir / fname
            fp.write_text(content, encoding="utf-8")
            pages.append(parse_page(fp))
        return pages

    def test_build_graph_nodes(self, temp_dir):
        pages = self.make_pages(temp_dir)
        G = build_graph(pages)
        assert G.number_of_nodes() == 3
        assert "Transformer" in G
        assert "Attention" in G

    def test_edge_types(self, temp_dir):
        pages = self.make_pages(temp_dir)
        G = build_graph(pages)
        edges = list(G.edges(data=True))
        # Should have wikilinks + declared relations
        assert len(edges) >= 3


class TestGraphQueries:
    def make_graph(self, temp_dir) -> nx.DiGraph:
        pages_data = [
            ("transformer.md", SAMPLE_PAGE),
            ("attention.md", SAMPLE_PAGE_2),
            ("orphan.md", SAMPLE_PAGE_3),
        ]
        pages = []
        for fname, content in pages_data:
            fp = temp_dir / fname
            fp.write_text(content, encoding="utf-8")
            pages.append(parse_page(fp))
        return build_graph(pages)

    def test_backlinks(self, temp_dir):
        G = self.make_graph(temp_dir)
        bl = get_backlinks(G, "Transformer")
        # Attention links to Transformer
        assert "Attention" in bl or "Orphan" in bl

    def test_wikilinks(self, temp_dir):
        G = self.make_graph(temp_dir)
        wl = get_wikilinks(G, "Transformer")
        assert "Attention" in wl

    def test_find_orphans(self, temp_dir):
        G = self.make_graph(temp_dir)
        orphans = find_orphans(G)
        assert "Orphan" in orphans

    def test_find_paths(self, temp_dir):
        G = self.make_graph(temp_dir)
        paths = find_paths(G, "Transformer", "Attention", max_len=3)
        # There will be paths because of wikilinks + declared relations
        assert len(paths) >= 1

    def test_find_dead_links_empty_when_clean(self, temp_dir):
        G = self.make_graph(temp_dir)
        # In a clean graph, there should be no dead links
        dead = find_dead_links(G)
        assert len(dead) == 0


class TestGraphStats:
    def make_graph(self, temp_dir):
        pages_data = [
            ("transformer.md", SAMPLE_PAGE),
            ("attention.md", SAMPLE_PAGE_2),
        ]
        pages = []
        for fname, content in pages_data:
            fp = temp_dir / fname
            fp.write_text(content, encoding="utf-8")
            pages.append(parse_page(fp))
        return build_graph(pages)

    def test_stats(self, temp_dir):
        G = self.make_graph(temp_dir)
        stats = graph_stats(G)
        assert stats["nodes"] >= 1
        assert "by_type" in stats

    def test_hub_pages(self, temp_dir):
        G = self.make_graph(temp_dir)
        hubs = hub_pages(G)
        assert len(hubs) >= 1

    def test_impact_analysis(self, temp_dir):
        G = self.make_graph(temp_dir)
        affected = impact_analysis(G, "Transformer", depth=2)
        assert isinstance(affected, list)
