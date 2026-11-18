import { API_BASE_URL, del, get, post, put, type CallOptions } from "./client"

/** The API sends the banner as a path on itself; the browser needs the API's own address in front of it. */
const absolute = (path: string) => (path.startsWith("/") ? `${API_BASE_URL}${path}` : path)

/** Creator ads on Home (owner request 2026-11-18): a content creator pays 5,000 FOL$ (24 h) or 8,000 (48 h) to show one of their TikTok videos as a banner in the Home slider. */
export type AdHours = 24 | 48
export type AdStatus = "pending" | "approved" | "rejected" | "cancelled"

/** A running ad, as the Home slider shows it. */
export interface PublicAd { id: string; url: string; handle: string; title: string; imageUrl: string; endsAt: string }

export interface MyAd {
  id: string
  url: string
  handle: string
  title: string
  hours: AdHours
  price: number
  status: AdStatus
  note: string
  createdAt: string
  startsAt: string | null
  endsAt: string | null
  imageUrl: string
}

export interface MyAds { prices: Record<string, number>; balance: number; tiktokHandle: string | null; ads: MyAd[] }

export interface StaffAd { id: string; url: string; handle: string; title: string; hours: AdHours; price: number; createdAt: string; imageUrl: string; creator: { steamId: string; username: string; avatar: string } }

export const creatorAdsService = {
  /** Public: the ads running now (at most five). */
  async running(options?: CallOptions): Promise<PublicAd[]> {
    const response = await get<{ ads: PublicAd[] }>("/api/v1/public/creator-ads", undefined, options)
    return (response.ads ?? []).map((ad) => ({ ...ad, imageUrl: absolute(ad.imageUrl) }))
  },
  async mine(options?: CallOptions): Promise<MyAds> {
    const response = await get<MyAds>("/api/v1/creators/me/ads", undefined, options)
    return { ...response, ads: response.ads.map((ad) => ({ ...ad, imageUrl: absolute(ad.imageUrl) })) }
  },
  submit: (body: { url: string; hours: AdHours }, options?: CallOptions) => post<{ id: string; status: AdStatus; title: string; imageUrl: string }>("/api/v1/creators/me/ads", body, options),
  cancel: (id: string, options?: CallOptions) => del<{ id: string; status: AdStatus }>(`/api/v1/creators/me/ads/${encodeURIComponent(id)}`, options),
  /** Staff (moderators and above; the API checks). */
  async pending(options?: CallOptions): Promise<{ ads: StaffAd[] }> {
    const response = await get<{ ads: StaffAd[] }>("/api/v1/staff/creator-ads", undefined, options)
    return { ads: response.ads.map((ad) => ({ ...ad, imageUrl: absolute(ad.imageUrl) })) }
  },
  decide: (id: string, body: { decision: "approve" | "reject"; note?: string }, options?: CallOptions) => put<{ id: string; status: AdStatus; endsAt: string | null }>(`/api/v1/staff/creator-ads/${encodeURIComponent(id)}`, body, options),
}
