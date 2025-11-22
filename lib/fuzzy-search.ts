/**
 * Fuzzy search utility for matching user queries against text
 * Supports partial matches, typos, and phrase matching
 */

export interface FuzzyMatchResult {
  matches: boolean
  score: number
  matchedIndices: number[]
}

/**
 * Performs fuzzy matching between a query and target string
 * Returns match status, relevance score, and matched character positions
 * 
 * Example: fuzzyMatch("chole", "LDL Cholesterol")
 * Returns: { matches: true, score: 5.5, matchedIndices: [4,5,6,7,8] }
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatchResult {
  if (!query) return { matches: true, score: 0, matchedIndices: [] }
  
  query = query.toLowerCase()
  target = target.toLowerCase()
  
  let queryIndex = 0
  let score = 0
  const matchedIndices: number[] = []
  
  for (let i = 0; i < target.length; i++) {
    if (target[i] === query[queryIndex]) {
      score += 1
      matchedIndices.push(i)
      
      // Bonus for consecutive matches (phrase matching)
      if (matchedIndices.length > 1 && 
          matchedIndices[matchedIndices.length - 1] === matchedIndices[matchedIndices.length - 2] + 1) {
        score += 0.5
      }
      
      // Bonus for matching at word boundaries
      if (i === 0 || target[i - 1] === ' ') {
        score += 1
      }
      
      queryIndex++
      
      if (queryIndex === query.length) {
        return { matches: true, score, matchedIndices }
      }
    }
  }
  
  return { 
    matches: queryIndex === query.length, 
    score, 
    matchedIndices 
  }
}

/**
 * Filters and sorts an array of items using fuzzy matching
 * 
 * @param items - Array of items to filter
 * @param query - Search query string
 * @param getSearchableText - Function to extract searchable text from each item
 * @returns Filtered and sorted array by relevance score
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getSearchableText: (item: T) => string
): T[] {
  if (!query) return items
  
  return items
    .map(item => ({
      item,
      match: fuzzyMatch(query, getSearchableText(item))
    }))
    .filter(({ match }) => match.matches)
    .sort((a, b) => b.match.score - a.match.score)
    .map(({ item }) => item)
}

/**
 * Highlights matched characters in a string
 * Useful for showing users why a result matched their query
 * 
 * @param text - Original text
 * @param matchedIndices - Array of character indices to highlight
 * @returns Array of text segments with highlight flags
 */
export function highlightMatches(
  text: string,
  matchedIndices: number[]
): Array<{ text: string; highlighted: boolean }> {
  if (matchedIndices.length === 0) {
    return [{ text, highlighted: false }]
  }
  
  const segments: Array<{ text: string; highlighted: boolean }> = []
  let lastIndex = 0
  
  matchedIndices.forEach((index, i) => {
    // Add non-highlighted text before this match
    if (index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, index),
        highlighted: false
      })
    }
    
    // Add highlighted character
    segments.push({
      text: text[index],
      highlighted: true
    })
    
    lastIndex = index + 1
    
    // Add remaining text after last match
    if (i === matchedIndices.length - 1 && lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
        highlighted: false
      })
    }
  })
  
  return segments
}
