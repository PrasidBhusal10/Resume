import { supabase } from "./supabase";
import type { Resume } from "./types";

function toRow(userEmail: string, r: Resume) {
  return {
    client_id:     r.clientId,
    user_email:    userEmail,
    title:         r.title,
    version:       r.version,
    template_id:   r.templateId,
    template_name: r.templateName,
    category:      r.category,
    sections:      r.sections,
    created_at:    r.createdAt,
    updated_at:    new Date().toISOString(),
  };
}

function fromRow(row: Record<string, unknown>): Resume {
  return {
    id:           row.id as number,
    clientId:     row.client_id as string,
    title:        row.title as string,
    version:      row.version as number,
    templateId:   row.template_id as number,
    templateName: row.template_name as string,
    category:     row.category as string,
    sections:     row.sections as Resume["sections"],
    createdAt:    row.created_at as string,
    updatedAt:    row.updated_at as string,
  };
}

export async function dbLoadResumes(userEmail: string): Promise<Resume[]> {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message ?? error.code ?? "Supabase query failed");
  return (data ?? []).map(fromRow);
}

// Always upsert on client_id — no more isNew confusion
export async function dbSaveResume(userEmail: string, resume: Resume): Promise<number> {
  const { data, error } = await supabase
    .from("resumes")
    .upsert(toRow(userEmail, resume), { onConflict: "client_id" })
    .select("id")
    .single();

  if (error) throw new Error(error.message ?? "Supabase upsert failed");
  return data.id as number;
}

export async function dbDeleteResume(clientId: string): Promise<void> {
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("client_id", clientId);

  if (error) throw new Error(error.message ?? "Supabase delete failed");
}
