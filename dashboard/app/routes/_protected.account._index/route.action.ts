import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";

export const action = withSupabase(
  async ({ supabase, supabaseServiceRole: supabaseAdmin, request }) => {
    const currentUser = await supabase.auth.getUser();
    if (!currentUser.data?.user) {
      throw new Error("User not found");
    }

    const { user } = currentUser.data;

    const formData = await request.formData();

    const firstName = (formData.get("firstName") as string | null)?.trim();
    const lastName = (formData.get("lastName") as string | null)?.trim();
    const newEmail = (formData.get("newEmail") as string | null)?.trim();

    if (!firstName || !lastName) {
      return data(
        {
          success: false,
          error: "First name and last name are required",
          toast_msg: "First name and last name are required",
        },
        { status: 400 },
      );
    }

    const shouldUpdateEmail = Boolean(newEmail && newEmail !== user.email);

    if (shouldUpdateEmail && newEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return data(
          {
            success: false,
            error: "Please enter a valid email address",
            toast_msg: "Please enter a valid email address",
          },
          { status: 400 },
        );
      }

      const { error: emailError } =
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email: newEmail,
        });

      if (emailError) {
        return data(
          {
            success: false,
            error: emailError.message,
            toast_msg: emailError.message,
          },
          { status: 400 },
        );
      }
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (error) {
      return data(
        { success: false, error: error.message, toast_msg: error.message },
        { status: 400 },
      );
    }

    return data({
      success: true,
      toast_msg: shouldUpdateEmail
        ? "Profile and email updated successfully"
        : "Profile updated successfully",
      user: {
        email: shouldUpdateEmail ? newEmail : user.email,
        firstName,
        lastName,
      },
    });
  },
);
