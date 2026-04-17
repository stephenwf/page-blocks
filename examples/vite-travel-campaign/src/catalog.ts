export type CountryId = 'portugal' | 'japan';
export type CityId = 'lisbon' | 'porto' | 'tokyo' | 'kyoto';
export type SeasonId = '' | 'spring' | 'summer' | 'winter';

export interface TravelOfferCardData {
  eyebrow: string;
  title: string;
  summary: string;
  price: string;
  meta: string;
  href: string;
  image: string;
  badge?: string;
}

export interface TravelSearchResult {
  label: string;
  thumbnail: string;
  props: TravelOfferCardData;
}

export interface TravelSearchResponse {
  results: TravelSearchResult[];
}

export interface CountryDefinition {
  id: CountryId;
  name: string;
  strapline: string;
  accent: string;
}

export interface CityDefinition {
  id: CityId;
  country: CountryId;
  name: string;
  strapline: string;
  overview: string;
  image: string;
}

export interface SeasonDefinition {
  id: Exclude<SeasonId, ''>;
  label: string;
  mood: string;
}

export interface TravelSelection {
  country: CountryId;
  city: CityId;
  season: SeasonId;
}

interface TravelOfferSeed extends TravelOfferCardData {
  id: string;
  country: CountryId;
  city: CityId;
  season?: Exclude<SeasonId, ''>;
  searchText: string;
}

export const COUNTRIES: CountryDefinition[] = [
  {
    id: 'portugal',
    name: 'Portugal',
    strapline: 'Atlantic neighborhoods, tiled facades, and waterfront evenings.',
    accent: '#0a7a78',
  },
  {
    id: 'japan',
    name: 'Japan',
    strapline: 'Garden districts, lantern-lit lanes, and ritual-paced mornings.',
    accent: '#9b3f2f',
  },
];

export const CITIES: CityDefinition[] = [
  {
    id: 'lisbon',
    country: 'portugal',
    name: 'Lisbon',
    strapline: 'Hillside miradouros and long tram descents toward the water.',
    overview: 'Base your stay between Baixa, Graça, and Santos for easy museum, food, and river access.',
    image: '/travel/lisbon-tram.svg',
  },
  {
    id: 'porto',
    country: 'portugal',
    name: 'Porto',
    strapline: 'Stone riverfronts, cellar tastings, and blue-hour bridges.',
    overview: 'Lean into Ribeira evenings, tiled churches, and one slow afternoon across Vila Nova de Gaia.',
    image: '/travel/porto-river.svg',
  },
  {
    id: 'tokyo',
    country: 'japan',
    name: 'Tokyo',
    strapline: 'Layered neighborhoods, precise rail hops, and late-night counters.',
    overview: 'Treat the city as a sequence of compact districts, each with its own rhythm and appetite.',
    image: '/travel/tokyo-lanterns.svg',
  },
  {
    id: 'kyoto',
    country: 'japan',
    name: 'Kyoto',
    strapline: 'Temple walks, tea houses, and garden routes that reward early starts.',
    overview: 'Plan around western Arashiyama mornings, Higashiyama evenings, and mid-day market breaks.',
    image: '/travel/kyoto-garden.svg',
  },
];

export const SEASONS: SeasonDefinition[] = [
  {
    id: 'spring',
    label: 'Spring',
    mood: 'Fresh itineraries with blossom, shoulder-season pacing, and longer walking days.',
  },
  {
    id: 'summer',
    label: 'Summer',
    mood: 'Late light, rooftop plans, and cooler indoor resets built into each day.',
  },
  {
    id: 'winter',
    label: 'Winter',
    mood: 'Low-angle light, warm interiors, and slower cultural stops close to the hotel.',
  },
];

export const DEFAULT_SELECTION: TravelSelection = {
  country: 'portugal',
  city: 'lisbon',
  season: '',
};

const TRAVEL_OFFERS: TravelOfferSeed[] = [
  {
    id: 'lisbon-river-club',
    country: 'portugal',
    city: 'lisbon',
    eyebrow: 'Lisbon city stay',
    title: 'Alfama rooftops and river club check-in',
    summary: 'Three nights with a riverside hotel, tram pass, and a private food-led walk through Alfama and Mouraria.',
    price: 'From £640',
    meta: '3 nights · breakfast · evening food tour',
    href: '/offers?country=portugal&city=lisbon',
    image: '/travel/lisbon-tram.svg',
    badge: 'Best seller',
    searchText: 'lisbon portugal rooftop river tram alfama food tour city stay',
  },
  {
    id: 'lisbon-summer-waterfront',
    country: 'portugal',
    city: 'lisbon',
    season: 'summer',
    eyebrow: 'Lisbon summer',
    title: 'Waterfront afternoons and rooftop dinners',
    summary: 'A warm-weather package with shaded museum stops, a sunset sailing slot, and two dinner reservations near Santos.',
    price: 'From £810',
    meta: '4 nights · sailing add-on · rooftop dining',
    href: '/offers?country=portugal&city=lisbon&season=summer',
    image: '/travel/lisbon-tram.svg',
    badge: 'Summer edit',
    searchText: 'lisbon summer portugal rooftop waterfront santos sailing warm weather',
  },
  {
    id: 'porto-cellar-weekend',
    country: 'portugal',
    city: 'porto',
    eyebrow: 'Porto weekend',
    title: 'Cellar tastings across the Douro',
    summary: 'A long weekend anchored by Gaia cellar visits, a market lunch, and a riverside stay near Ribeira.',
    price: 'From £590',
    meta: '3 nights · tastings · walking itinerary',
    href: '/offers?country=portugal&city=porto',
    image: '/travel/porto-river.svg',
    searchText: 'porto portugal douro cellar gaia ribeira weekend tasting',
  },
  {
    id: 'tokyo-neighborhood-hop',
    country: 'japan',
    city: 'tokyo',
    eyebrow: 'Tokyo sampler',
    title: 'Three districts, one smart rail pass',
    summary: 'Split your stay between Asakusa and Shibuya with a dining list, rail guidance, and a late-night snack crawl.',
    price: 'From £1,180',
    meta: '4 nights · rail plan · neighborhood guide',
    href: '/offers?country=japan&city=tokyo',
    image: '/travel/tokyo-lanterns.svg',
    badge: 'Editor pick',
    searchText: 'tokyo japan shibuya asakusa rail city districts dining guide',
  },
  {
    id: 'kyoto-garden-retreat',
    country: 'japan',
    city: 'kyoto',
    eyebrow: 'Kyoto cultural stay',
    title: 'Garden districts and dawn temple entries',
    summary: 'Stay near Higashiyama with early-entry planning, a tea experience, and a walkable evening route back to Gion.',
    price: 'From £1,240',
    meta: '4 nights · tea ceremony · temple route',
    href: '/offers?country=japan&city=kyoto',
    image: '/travel/kyoto-garden.svg',
    searchText: 'kyoto japan garden temple gion cultural stay higashiyama tea',
  },
  {
    id: 'kyoto-spring-blossom',
    country: 'japan',
    city: 'kyoto',
    season: 'spring',
    eyebrow: 'Kyoto spring',
    title: 'Cherry blossom timing with quiet morning routes',
    summary: 'A blossom-season package that shifts temple visits earlier, adds garden reservations, and layers in evening kaiseki pacing.',
    price: 'From £1,420',
    meta: '5 nights · blossom timing · garden reservations',
    href: '/offers?country=japan&city=kyoto&season=spring',
    image: '/travel/kyoto-garden.svg',
    badge: 'Spring edit',
    searchText: 'kyoto spring blossom japan cherry temple garden kaiseki seasonal',
  },
];

export function getCountry(countryId: CountryId) {
  return COUNTRIES.find((country) => country.id === countryId) || COUNTRIES[0];
}

export function getCity(cityId: CityId) {
  return CITIES.find((city) => city.id === cityId) || CITIES[0];
}

export function getCitiesForCountry(countryId: CountryId) {
  return CITIES.filter((city) => city.country === countryId);
}

export function getSeason(seasonId: SeasonId) {
  return SEASONS.find((season) => season.id === seasonId);
}

export function createSearchParams(selection: TravelSelection) {
  const params = new URLSearchParams();
  params.set('country', selection.country);
  params.set('city', selection.city);
  if (selection.season) {
    params.set('season', selection.season);
  }
  return params.toString();
}

export function sanitizeSelection(params: URLSearchParams): TravelSelection {
  const country = COUNTRIES.some((entry) => entry.id === params.get('country'))
    ? (params.get('country') as CountryId)
    : DEFAULT_SELECTION.country;

  const cityOptions = getCitiesForCountry(country);
  const rawCity = params.get('city');
  const city = cityOptions.some((entry) => entry.id === rawCity)
    ? (rawCity as CityId)
    : cityOptions[0].id;

  const season = SEASONS.some((entry) => entry.id === params.get('season'))
    ? (params.get('season') as Exclude<SeasonId, ''>)
    : '';

  return { country, city, season };
}

export function createTravelSearchResponse(query: string): TravelSearchResponse {
  const normalized = query.trim().toLowerCase();
  const results = TRAVEL_OFFERS.filter((offer) => {
    if (!normalized) {
      return true;
    }

    return [offer.title, offer.summary, offer.eyebrow, offer.searchText].some((value) =>
      value.toLowerCase().includes(normalized)
    );
  }).map((offer) => ({
    label: offer.title,
    thumbnail: offer.image,
    props: {
      eyebrow: offer.eyebrow,
      title: offer.title,
      summary: offer.summary,
      price: offer.price,
      meta: offer.meta,
      href: offer.href,
      image: offer.image,
      badge: offer.badge,
    },
  }));

  return { results };
}

export function getAppContextSummary(selection: TravelSelection) {
  const country = getCountry(selection.country);
  const city = getCity(selection.city);
  const season = getSeason(selection.season);

  return {
    country,
    city,
    season,
    title: `${city.name}, ${country.name}`,
    body: season ? `${city.strapline} ${season.mood}` : `${city.strapline} ${country.strapline}`,
  };
}
