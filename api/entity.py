"""Entity management API."""

from fastapi import APIRouter, HTTPException

from core.wiki_io import read_page, write_page, list_pages, WikiPage, format_log_timestamp

router = APIRouter(prefix="/api/entities", tags=["entities"])


@router.get("")
async def list_entities():
    """List all entity-type pages."""
    all_titles = list_pages()
    entities = []
    for title in all_titles:
        page = read_page(title)
        if page and page.frontmatter.get("page_type") == "entity":
            entities.append(
                {
                    "title": title,
                    "status": page.frontmatter.get("status", "draft"),
                    "summary": page.frontmatter.get("summary", ""),
                    "updated_at": page.frontmatter.get("updated_at", ""),
                }
            )
    return {"entities": entities, "count": len(entities)}


@router.get("/{name}")
async def get_entity(name: str):
    """Get a single entity by title."""
    page = read_page(name)
    if page is None:
        raise HTTPException(status_code=404, detail=f"Entity '{name}' not found")
    return {
        "title": page.title,
        "content": page.content,
        "frontmatter": page.frontmatter,
    }


@router.put("/{name}")
async def update_entity(name: str, content: str, summary: str = ""):
    """Update an entity page's content."""
    page = read_page(name)
    if page is None:
        page = WikiPage(
            title=name,
            content=content,
            frontmatter={
                "title": name,
                "page_type": "entity",
                "status": "draft",
                "created_at": format_log_timestamp(),
            },
        )
    page.content = content
    page.frontmatter["updated_at"] = format_log_timestamp()
    if summary:
        page.frontmatter["summary"] = summary
    write_page(page)
    return {"title": name, "status": "updated"}
