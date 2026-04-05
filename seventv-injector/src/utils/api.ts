import { API_URL } from "../constants";

export interface EmoteImage {
  url: string;
  mime: string;
  scale: number;
  width: number;
  height: number;
  frameCount?: number | null;
}

export interface EmoteSummary {
  id: string;
  name: string;
  ownerDisplayName: string | null;
  images: EmoteImage[];
}

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

interface SearchEmotesResponse {
  emotes: {
    search: {
      items: Array<{
        id: string;
        defaultName: string;
        images: EmoteImage[];
        owner: {
          mainConnection: {
            platformDisplayName: string | null;
          } | null;
        } | null;
      }>;
    };
  };
}

async function graphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`7TV API request failed with status ${response.status}`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;

  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join(", "));
  }

  if (!body.data) {
    throw new Error("7TV API returned no data");
  }

  return body.data;
}

export async function searchEmotes(
  query: string | null,
  perPage = 30,
): Promise<EmoteSummary[]> {
  const data = await graphQL<SearchEmotesResponse>(
    `
      query InjectorSearchEmotes($query: String, $perPage: Int!) {
        emotes {
          search(
            query: $query
            sort: { sortBy: TRENDING_WEEKLY, order: DESCENDING }
            perPage: $perPage
          ) {
            items {
              id
              defaultName
              images {
                url
                mime
                scale
                width
                height
                frameCount
              }
              owner {
                mainConnection {
                  platformDisplayName
                }
              }
            }
          }
        }
      }
    `,
    {
      query,
      perPage,
    },
  );

  return data.emotes.search.items.map((item) => ({
    id: item.id,
    name: item.defaultName,
    ownerDisplayName: item.owner?.mainConnection?.platformDisplayName ?? null,
    images: item.images,
  }));
}

export function pickBestImage(images: EmoteImage[], preferredScale = 2): EmoteImage | null {
  if (!images.length) {
    return null;
  }

  return (
    [...images].sort(
      (left, right) =>
        Math.abs(left.scale - preferredScale) - Math.abs(right.scale - preferredScale),
    )[0] ?? null
  );
}
