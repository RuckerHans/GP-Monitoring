import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { DailyGpAnalysis, Branch, LoginResponse, User } from "@/lib/types";

export const gpApi = createApi({
  reducerPath: "gpApi",
  baseQuery: fetchBaseQuery({ baseUrl: "" }),
  tagTypes: ["Daily", "Branches", "Auth"],
  endpoints: (build) => ({
    getDaily: build.query<DailyGpAnalysis[], string | void>({
      query: (date) => ({ url: `/api/gp-analysis/daily${date ? `?date=${encodeURIComponent(date)}` : ""}` }),
      providesTags: ["Daily"]
    }),
    getBranches: build.query<Branch[], void>({
      query: () => ({ url: "/api/branches" }),
      providesTags: ["Branches"]
    }),
    login: build.mutation<LoginResponse, { username: string; password: string }>({
      query: (body) => ({ url: "/api/auth/login", method: "POST", body }),
      invalidatesTags: ["Auth"]
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/api/auth/logout", method: "POST" }),
      invalidatesTags: ["Auth"]
    }),
    me: build.query<{ user: User | null }, void>({
      query: () => ({ url: "/api/auth/me" }),
      providesTags: ["Auth"]
    })
  })
});

export const { useGetDailyQuery, useGetBranchesQuery, useLoginMutation, useLogoutMutation, useMeQuery } = gpApi;
