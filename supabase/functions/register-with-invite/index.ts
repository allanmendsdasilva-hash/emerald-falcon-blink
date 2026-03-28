import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, nome, email, password } = await req.json();

    if (!token || !nome || !email || !password) {
      console.warn("[register-with-invite] missing required fields");
      return Response.json(
        { success: false, message: "Token, nome, e-mail e senha são obrigatórios." },
        { status: 400, headers: corsHeaders },
      );
    }

    if (String(password).length < 6) {
      console.warn("[register-with-invite] password too short");
      return Response.json(
        { success: false, message: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400, headers: corsHeaders },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedToken = String(token).trim();
    const normalizedName = String(nome).trim();

    const { data: invite, error: inviteError } = await supabase
      .from("convites")
      .select("id, nivel, categoria_id, unidade_id, usado")
      .eq("token", normalizedToken)
      .eq("usado", false)
      .maybeSingle();

    if (inviteError) {
      console.error("[register-with-invite] invite lookup failed", inviteError);
      return Response.json(
        { success: false, message: "Não foi possível validar o convite." },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!invite) {
      console.warn("[register-with-invite] invalid invite token");
      return Response.json(
        { success: false, message: "Convite inválido ou já utilizado." },
        { status: 404, headers: corsHeaders },
      );
    }

    const { data: existingUsers, error: existingUsersError } = await supabase.auth.admin.listUsers();
    if (existingUsersError) {
      console.error("[register-with-invite] list users failed", existingUsersError);
      return Response.json(
        { success: false, message: "Não foi possível verificar usuários existentes." },
        { status: 500, headers: corsHeaders },
      );
    }

    const duplicatedEmail = existingUsers.users.some((user) => user.email?.toLowerCase() === normalizedEmail);
    if (duplicatedEmail) {
      console.warn("[register-with-invite] duplicated email", { email: normalizedEmail });
      return Response.json(
        { success: false, message: "Este e-mail já está em uso." },
        { status: 409, headers: corsHeaders },
      );
    }

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        nome: normalizedName,
      },
    });

    if (createUserError || !createdUser.user) {
      console.error("[register-with-invite] create user failed", createUserError);
      return Response.json(
        { success: false, message: createUserError?.message ?? "Não foi possível criar o usuário." },
        { status: 400, headers: corsHeaders },
      );
    }

    const userId = createdUser.user.id;

    const { error: profileError } = await supabase.from("usuarios").insert({
      id: userId,
      nome: normalizedName,
      email: normalizedEmail,
      nivel: invite.nivel,
      categoria_id: invite.categoria_id,
      unidade_id: invite.unidade_id,
    });

    if (profileError) {
      console.error("[register-with-invite] profile insert failed", profileError);
      await supabase.auth.admin.deleteUser(userId);
      return Response.json(
        { success: false, message: "Não foi possível criar o perfil de acesso." },
        { status: 500, headers: corsHeaders },
      );
    }

    const { error: inviteUpdateError } = await supabase
      .from("convites")
      .update({ usado: true })
      .eq("id", invite.id);

    if (inviteUpdateError) {
      console.error("[register-with-invite] invite update failed", inviteUpdateError);
      await supabase.from("usuarios").delete().eq("id", userId);
      await supabase.auth.admin.deleteUser(userId);
      return Response.json(
        { success: false, message: "Não foi possível finalizar o convite." },
        { status: 500, headers: corsHeaders },
      );
    }

    console.log("[register-with-invite] user created successfully", {
      userId,
      nivel: invite.nivel,
    });

    return Response.json(
      {
        success: true,
        userId,
        nivel: invite.nivel,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("[register-with-invite] unexpected error", error);
    return Response.json(
      { success: false, message: "Erro inesperado ao processar o convite." },
      { status: 500, headers: corsHeaders },
    );
  }
});
