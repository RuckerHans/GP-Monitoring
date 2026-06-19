import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@/lib/types";

interface AuthState {
  user: User | null;
}

const initialState: AuthState = {
  user: null
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state: AuthState, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    clearUser(state: AuthState) {
      state.user = null;
    }
  }
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
