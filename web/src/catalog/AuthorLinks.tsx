import { Fragment, type MouseEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { splitAuthors } from './filter'

/**
 * Renders a book's author(s) as comma-separated links, one per author, each
 * filtering the catalog by that individual author. Multi-author strings like
 * "Giuseppe Penone, Alain Elkann" become two separate links rather than one blob.
 */
export function AuthorLinks({
  author,
  className,
  onClick,
}: {
  author: string
  className?: string
  onClick?: MouseEventHandler
}) {
  const authors = splitAuthors(author)
  if (authors.length === 0) return null
  return (
    <>
      {authors.map((a, i) => (
        <Fragment key={`${a}-${i}`}>
          {i > 0 && ', '}
          <Link to={`/?author=${encodeURIComponent(a)}`} className={className} onClick={onClick}>
            {a}
          </Link>
        </Fragment>
      ))}
    </>
  )
}
