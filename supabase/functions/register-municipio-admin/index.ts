import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { municipioNome, nome, email, password } = await req.json();

    if (!municipioNome || !nome || !email || !password) {
      console.warn("[register-municipio-admin] missing required fields");
      return Response.json(
        { success: false, message: "Município, nome, e-mail e senha são obrigatórios." },
        { status: 400, headers: corsHeaders },
      );
    }

    if (String(password).length < 6) {
      console.warn("[register-municipio-admin] password too short");
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

    const normalizedMunicipio = String(municipioNome).trim();
    const normalizedName = String(nome).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: existingUsers, error: existingUsersError } = await supabase.auth.admin.listUsers();
    if (existingUsersError) {
      console.error("[register-municipio-admin] list users failed", existingUsersError);
      return Response.json(
        { success: false, message: "Não foi possível verificar usuários existentes." },
        { status: 500, headers: corsHeaders },
      );
    }

    const duplicatedEmail = existingUsers.users.some((user) => user.email?.toLowerCase() === normalizedEmail);
    if (duplicatedEmail) {
      console.warn("[register-municipio-admin] duplicated email", { email: normalizedEmail });
      return Response.json(
        { success: false, message: "Este e-mail já está em uso." },
        { status: 409, headers: corsHeaders },
      );
    }

    const baseSlug = slugify(normalizedMunicipio) || "municipio";
    let slug = baseSlug;
    let attempt = 1;

    while (true) {
      const { data: existingMunicipio, error: existingMunicipioError } = await supabase
        .from("municipios")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingMunicipioError) {
        console.error("[register-municipio-admin] municipio slug lookup failed", existingMunicipioError);
        return Response.json(
          { success: false, message: "Não foi possível validar o município." },
          { status: 500, headers: corsHeaders },
        );
      }

      if (!existingMunicipio) {
        break;
      }

      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const { data: municipio, error: municipioError } = await supabase
      .from("municipios")
      .insert({ nome: normalizedMunicipio, slug })
      .select("id, nome, slug")
      .single();

    if (municipioError || !municipio) {
      console.error("[register-municipio-admin] municipio create failed", municipioError);
      return Response.json(
        { success: false, message: "Não foi possível criar o município." },
        { status: 500, headers: corsHeaders },
      );
    }

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        nome: normalizedName,
        municipio_nome: normalizedMunicipio,
      },
    });

    if (createUserError || !createdUser.user) {
      console.error("[register-municipio-admin] create user failed", createUserError);
      await supabase.from("municipios").delete().eq("id", municipio.id);
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
      nivel: "admin",
      municipio_id: municipio.id,
    });

    if (profileError) {
      console.error("[register-municipio-admin] profile insert failed", profileError);
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from("municipios").delete().eq("id", municipio.id);
      return Response.json(
        { success: false, message: "Não foi possível criar o administrador do município." },
        { status: 500, headers: corsHeaders },
      );
    }

    console.log("[register-municipio-admin] municipio admin created", {
      userId,
      municipioId: municipio.id,
      slug: municipio.slug,
    });

    return Response.json(
      {
        success: true,
        userId,
        municipioId: municipio.id,
        municipioSlug: municipio.slug,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("[register-municipio-admin] unexpected error", error);
    return Response.json(
      { success: false, message: "Erro inesperado ao criar o município." },
      { status: 500, headers: corsHeaders },
    );
  }
});
