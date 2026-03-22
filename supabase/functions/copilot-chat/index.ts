import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definitions for Gemini function calling
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_my_clients",
      description: "Get list of trainer's own clients with their data",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_program",
      description: "Get full program details for a specific client by name",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "اسم العميل" },
        },
        required: ["client_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_exercise",
      description: "Update an exercise in a program (sets, reps, weight). Requires trainer confirmation.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "اسم العميل" },
          exercise_name: { type: "string", description: "اسم التمرين" },
          sets: { type: "number", description: "عدد المجموعات الجديد" },
          reps: { type: "number", description: "عدد التكرارات الجديد" },
          weight: { type: "number", description: "الوزن الجديد بالكجم" },
        },
        required: ["client_name", "exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_exercise",
      description: "Add a new exercise to a client's program day. Requires trainer confirmation.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "اسم العميل" },
          day_name: { type: "string", description: "اسم اليوم (مثل: يوم الصدر)" },
          exercise_name: { type: "string", description: "اسم التمرين" },
          sets: { type: "number", description: "عدد المجموعات" },
          reps: { type: "number", description: "عدد التكرارات" },
          weight: { type: "number", description: "الوزن بالكجم" },
        },
        required: ["client_name", "day_name", "exercise_name", "sets", "reps"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_exercise",
      description: "Remove an exercise from a client's program. Requires trainer confirmation.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "اسم العميل" },
          exercise_name: { type: "string", description: "اسم التمرين المراد حذفه" },
        },
        required: ["client_name", "exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_calendar_session",
      description: "Add a training session to trainer's calendar. Requires trainer confirmation.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "اسم العميل" },
          session_date: { type: "string", description: "التاريخ بصيغة YYYY-MM-DD" },
          start_time: { type: "string", description: "الوقت بصيغة HH:MM" },
          duration_minutes: { type: "number", description: "المدة بالدقائق" },
          session_type: { type: "string", description: "نوع الجلسة: تدريب / استشارة / متابعة" },
          notes: { type: "string", description: "ملاحظات" },
        },
        required: ["client_name", "session_date", "start_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_client_info",
      description: "Update basic client info (goal, weight target, notes, injuries). Requires trainer confirmation.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "اسم العميل" },
          goal: { type: "string", description: "الهدف الجديد" },
          weight: { type: "number", description: "الوزن الحالي" },
          injuries: { type: "string", description: "إصابات أو ملاحظات صحية" },
          days_per_week: { type: "number", description: "عدد أيام التمرين أسبوعياً" },
        },
        required: ["client_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_nutrition",
      description: "Update a meal item in client's nutrition plan. Requires trainer confirmation.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "اسم العميل" },
          food_name: { type: "string", description: "اسم الطعام المراد تعديله" },
          new_food_name: { type: "string", description: "اسم الطعام الجديد" },
          calories: { type: "number", description: "السعرات" },
          protein: { type: "number", description: "البروتين" },
          carbs: { type: "number", description: "الكربوهيدرات" },
          fats: { type: "number", description: "الدهون" },
        },
        required: ["client_name", "food_name"],
      },
    },
  },
];

// Helper: find client by name (fuzzy)
function findClient(clients: any[], name: string) {
  const lower = name.trim().toLowerCase();
  return clients.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      c.name.toLowerCase().includes(lower) ||
      lower.includes(c.name.toLowerCase())
  );
}

// Service-role client for write operations
function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Execute tool with security checks
async function executeTool(
  toolName: string,
  args: any,
  trainerId: string,
  supabase: any
): Promise<{ result: any; needsConfirmation: boolean; confirmationMessage?: string; actionLog?: any }> {
  const serviceDb = getServiceClient();

  // Read-only tools
  if (toolName === "get_my_clients") {
    const { data } = await supabase
      .from("clients")
      .select("id, name, goal, weight, height, age, experience, week_number, last_workout_date, subscription_end_date, injuries, program_id, subscription_price, billing_cycle, days_per_week")
      .eq("trainer_id", trainerId)
      .order("name")
      .limit(200);
    return { result: data || [], needsConfirmation: false };
  }

  if (toolName === "get_client_program") {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, program_id")
      .eq("trainer_id", trainerId);
    const client = findClient(clients || [], args.client_name);
    if (!client) return { result: { error: `لم أجد عميلاً باسم "${args.client_name}"` }, needsConfirmation: false };
    if (!client.program_id) return { result: { error: `${client.name} ليس لديه برنامج تدريب حالياً` }, needsConfirmation: false };

    const { data: program } = await supabase
      .from("programs")
      .select("id, name, weeks")
      .eq("id", client.program_id)
      .eq("trainer_id", trainerId)
      .maybeSingle();
    if (!program) return { result: { error: "البرنامج غير موجود" }, needsConfirmation: false };

    const { data: days } = await supabase
      .from("program_days")
      .select("id, day_name, day_order")
      .eq("program_id", program.id)
      .order("day_order");

    const dayIds = (days || []).map((d: any) => d.id);
    let exercises: any[] = [];
    if (dayIds.length > 0) {
      const { data } = await supabase
        .from("program_exercises")
        .select("id, day_id, name, sets, reps, weight, exercise_order")
        .in("day_id", dayIds)
        .order("exercise_order");
      exercises = data || [];
    }

    const fullProgram = {
      ...program,
      client_name: client.name,
      days: (days || []).map((d: any) => ({
        ...d,
        exercises: exercises.filter((e: any) => e.day_id === d.id),
      })),
    };
    return { result: fullProgram, needsConfirmation: false };
  }

  // Write tools — all need confirmation
  if (toolName === "update_exercise") {
    const { data: clients } = await supabase.from("clients").select("id, name, program_id").eq("trainer_id", trainerId);
    const client = findClient(clients || [], args.client_name);
    if (!client?.program_id) return { result: { error: `لم أجد عميلاً أو برنامجاً لـ "${args.client_name}"` }, needsConfirmation: false };

    const { data: program } = await supabase.from("programs").select("id").eq("id", client.program_id).eq("trainer_id", trainerId).maybeSingle();
    if (!program) return { result: { error: "غير مصرح" }, needsConfirmation: false };

    const { data: days } = await supabase.from("program_days").select("id").eq("program_id", program.id);
    const dayIds = (days || []).map((d: any) => d.id);
    if (dayIds.length === 0) return { result: { error: "لا توجد أيام في البرنامج" }, needsConfirmation: false };

    const { data: exercises } = await supabase.from("program_exercises").select("*").in("day_id", dayIds);
    const exercise = (exercises || []).find((e: any) => e.name.toLowerCase().includes(args.exercise_name.toLowerCase()));
    if (!exercise) return { result: { error: `لم أجد تمريناً باسم "${args.exercise_name}"` }, needsConfirmation: false };

    const updates: any = {};
    const changes: string[] = [];
    if (args.sets !== undefined) { updates.sets = args.sets; changes.push(`المجموعات: ${exercise.sets} → ${args.sets}`); }
    if (args.reps !== undefined) { updates.reps = args.reps; changes.push(`التكرارات: ${exercise.reps} → ${args.reps}`); }
    if (args.weight !== undefined) { updates.weight = args.weight; changes.push(`الوزن: ${exercise.weight} → ${args.weight} كجم`); }

    if (changes.length === 0) return { result: { error: "لم تحدد أي تعديل" }, needsConfirmation: false };

    return {
      result: { action: "update_exercise", exercise_id: exercise.id, updates, client_name: client.name, exercise_name: exercise.name },
      needsConfirmation: true,
      confirmationMessage: `✏️ تعديل تمرين "${exercise.name}" لـ ${client.name}\n${changes.join("\n")}`,
      actionLog: { action_type: "update_exercise", affected_resource: "program_exercises", affected_resource_id: exercise.id, before_state: { sets: exercise.sets, reps: exercise.reps, weight: exercise.weight }, after_state: updates },
    };
  }

  if (toolName === "add_exercise") {
    const { data: clients } = await supabase.from("clients").select("id, name, program_id").eq("trainer_id", trainerId);
    const client = findClient(clients || [], args.client_name);
    if (!client?.program_id) return { result: { error: `لم أجد عميلاً أو برنامجاً لـ "${args.client_name}"` }, needsConfirmation: false };

    const { data: program } = await supabase.from("programs").select("id").eq("id", client.program_id).eq("trainer_id", trainerId).maybeSingle();
    if (!program) return { result: { error: "غير مصرح" }, needsConfirmation: false };

    const { data: days } = await supabase.from("program_days").select("id, day_name").eq("program_id", program.id);
    const day = (days || []).find((d: any) => d.day_name.toLowerCase().includes(args.day_name.toLowerCase()));
    if (!day) return { result: { error: `لم أجد يوماً باسم "${args.day_name}"` }, needsConfirmation: false };

    return {
      result: { action: "add_exercise", day_id: day.id, day_name: day.day_name, client_name: client.name, exercise: { name: args.exercise_name, sets: args.sets, reps: args.reps, weight: args.weight || 0 } },
      needsConfirmation: true,
      confirmationMessage: `➕ إضافة تمرين "${args.exercise_name}" إلى ${day.day_name} لـ ${client.name}\n${args.sets} مجموعات × ${args.reps} تكرار${args.weight ? ` × ${args.weight} كجم` : ""}`,
      actionLog: { action_type: "add_exercise", affected_resource: "program_exercises", before_state: {}, after_state: { name: args.exercise_name, sets: args.sets, reps: args.reps, weight: args.weight || 0 } },
    };
  }

  if (toolName === "remove_exercise") {
    const { data: clients } = await supabase.from("clients").select("id, name, program_id").eq("trainer_id", trainerId);
    const client = findClient(clients || [], args.client_name);
    if (!client?.program_id) return { result: { error: `لم أجد عميلاً أو برنامجاً لـ "${args.client_name}"` }, needsConfirmation: false };

    const { data: program } = await supabase.from("programs").select("id").eq("id", client.program_id).eq("trainer_id", trainerId).maybeSingle();
    if (!program) return { result: { error: "غير مصرح" }, needsConfirmation: false };

    const { data: days } = await supabase.from("program_days").select("id").eq("program_id", program.id);
    const dayIds = (days || []).map((d: any) => d.id);
    const { data: exercises } = await supabase.from("program_exercises").select("*").in("day_id", dayIds);
    const exercise = (exercises || []).find((e: any) => e.name.toLowerCase().includes(args.exercise_name.toLowerCase()));
    if (!exercise) return { result: { error: `لم أجد تمريناً باسم "${args.exercise_name}"` }, needsConfirmation: false };

    return {
      result: { action: "remove_exercise", exercise_id: exercise.id, client_name: client.name, exercise_name: exercise.name },
      needsConfirmation: true,
      confirmationMessage: `🗑️ حذف تمرين "${exercise.name}" من برنامج ${client.name}\n(${exercise.sets}×${exercise.reps} @ ${exercise.weight}كجم)`,
      actionLog: { action_type: "remove_exercise", affected_resource: "program_exercises", affected_resource_id: exercise.id, before_state: { name: exercise.name, sets: exercise.sets, reps: exercise.reps, weight: exercise.weight }, after_state: {} },
    };
  }

  if (toolName === "add_calendar_session") {
    const { data: clients } = await supabase.from("clients").select("id, name").eq("trainer_id", trainerId);
    const client = findClient(clients || [], args.client_name);
    if (!client) return { result: { error: `لم أجد عميلاً باسم "${args.client_name}"` }, needsConfirmation: false };

    return {
      result: { action: "add_calendar_session", client_id: client.id, client_name: client.name, session_date: args.session_date, start_time: args.start_time, duration_minutes: args.duration_minutes || 60, session_type: args.session_type || "تدريب", notes: args.notes || "" },
      needsConfirmation: true,
      confirmationMessage: `📅 إضافة جلسة ${args.session_type || "تدريب"} لـ ${client.name}\nالتاريخ: ${args.session_date}\nالوقت: ${args.start_time}\nالمدة: ${args.duration_minutes || 60} دقيقة`,
      actionLog: { action_type: "add_calendar_session", affected_resource: "trainer_sessions", before_state: {}, after_state: { client_name: client.name, session_date: args.session_date, start_time: args.start_time } },
    };
  }

  if (toolName === "update_client_info") {
    const { data: clients } = await supabase.from("clients").select("id, name, goal, weight, injuries, days_per_week").eq("trainer_id", trainerId);
    const client = findClient(clients || [], args.client_name);
    if (!client) return { result: { error: `لم أجد عميلاً باسم "${args.client_name}"` }, needsConfirmation: false };

    const updates: any = {};
    const changes: string[] = [];
    if (args.goal) { updates.goal = args.goal; changes.push(`الهدف: ${client.goal || "—"} → ${args.goal}`); }
    if (args.weight !== undefined) { updates.weight = args.weight; changes.push(`الوزن: ${client.weight || "—"} → ${args.weight} كجم`); }
    if (args.injuries !== undefined) { updates.injuries = args.injuries; changes.push(`إصابات: ${client.injuries || "—"} → ${args.injuries}`); }
    if (args.days_per_week !== undefined) { updates.days_per_week = args.days_per_week; changes.push(`أيام التمرين: ${client.days_per_week || "—"} → ${args.days_per_week}`); }

    if (changes.length === 0) return { result: { error: "لم تحدد أي تعديل" }, needsConfirmation: false };

    return {
      result: { action: "update_client_info", client_id: client.id, client_name: client.name, updates },
      needsConfirmation: true,
      confirmationMessage: `✏️ تعديل بيانات ${client.name}\n${changes.join("\n")}`,
      actionLog: { action_type: "update_client_info", affected_resource: "clients", affected_resource_id: client.id, before_state: { goal: client.goal, weight: client.weight, injuries: client.injuries, days_per_week: client.days_per_week }, after_state: updates },
    };
  }

  if (toolName === "update_nutrition") {
    const { data: clients } = await supabase.from("clients").select("id, name").eq("trainer_id", trainerId);
    const client = findClient(clients || [], args.client_name);
    if (!client) return { result: { error: `لم أجد عميلاً باسم "${args.client_name}"` }, needsConfirmation: false };

    const { data: plans } = await supabase.from("meal_plans").select("id, name").eq("trainer_id", trainerId).eq("client_id", client.id).limit(1);
    if (!plans?.length) return { result: { error: `${client.name} ليس لديه خطة تغذية` }, needsConfirmation: false };

    const { data: items } = await supabase.from("meal_items").select("*").eq("meal_plan_id", plans[0].id);
    const item = (items || []).find((i: any) => i.food_name.toLowerCase().includes(args.food_name.toLowerCase()));
    if (!item) return { result: { error: `لم أجد "${args.food_name}" في خطة تغذية ${client.name}` }, needsConfirmation: false };

    const updates: any = {};
    const changes: string[] = [];
    if (args.new_food_name) { updates.food_name = args.new_food_name; changes.push(`الاسم: ${item.food_name} → ${args.new_food_name}`); }
    if (args.calories !== undefined) { updates.calories = args.calories; changes.push(`السعرات: ${item.calories} → ${args.calories}`); }
    if (args.protein !== undefined) { updates.protein = args.protein; changes.push(`البروتين: ${item.protein} → ${args.protein}g`); }
    if (args.carbs !== undefined) { updates.carbs = args.carbs; changes.push(`الكربوهيدرات: ${item.carbs} → ${args.carbs}g`); }
    if (args.fats !== undefined) { updates.fats = args.fats; changes.push(`الدهون: ${item.fats} → ${args.fats}g`); }

    if (changes.length === 0) return { result: { error: "لم تحدد أي تعديل" }, needsConfirmation: false };

    return {
      result: { action: "update_nutrition", item_id: item.id, client_name: client.name, food_name: item.food_name, updates },
      needsConfirmation: true,
      confirmationMessage: `🍽️ تعديل "${item.food_name}" في خطة تغذية ${client.name}\n${changes.join("\n")}`,
      actionLog: { action_type: "update_nutrition", affected_resource: "meal_items", affected_resource_id: item.id, before_state: { food_name: item.food_name, calories: item.calories, protein: item.protein, carbs: item.carbs, fats: item.fats }, after_state: updates },
    };
  }

  return { result: { error: "أداة غير معروفة" }, needsConfirmation: false };
}

// Execute confirmed action
async function executeConfirmedAction(action: any, trainerId: string, supabase: any) {
  const serviceDb = getServiceClient();

  switch (action.action) {
    case "update_exercise": {
      const { error } = await supabase.from("program_exercises").update(action.updates).eq("id", action.exercise_id);
      if (error) throw error;
      return `تم تعديل تمرين "${action.exercise_name}" لـ ${action.client_name} ✅`;
    }
    case "add_exercise": {
      const { data: maxOrder } = await supabase.from("program_exercises").select("exercise_order").eq("day_id", action.day_id).order("exercise_order", { ascending: false }).limit(1);
      const nextOrder = (maxOrder?.[0]?.exercise_order || 0) + 1;
      const { error } = await supabase.from("program_exercises").insert({ day_id: action.day_id, name: action.exercise.name, sets: action.exercise.sets, reps: action.exercise.reps, weight: action.exercise.weight, exercise_order: nextOrder });
      if (error) throw error;
      return `تمت إضافة "${action.exercise.name}" إلى ${action.day_name} لـ ${action.client_name} ✅`;
    }
    case "remove_exercise": {
      const { error } = await supabase.from("program_exercises").delete().eq("id", action.exercise_id);
      if (error) throw error;
      return `تم حذف "${action.exercise_name}" من برنامج ${action.client_name} ✅`;
    }
    case "add_calendar_session": {
      const { error } = await supabase.from("trainer_sessions").insert({ trainer_id: trainerId, client_id: action.client_id, session_date: action.session_date, start_time: action.start_time, duration_minutes: action.duration_minutes, session_type: action.session_type, notes: action.notes });
      if (error) throw error;
      return `تمت إضافة جلسة ${action.session_type} لـ ${action.client_name} يوم ${action.session_date} ✅`;
    }
    case "update_client_info": {
      const { error } = await supabase.from("clients").update(action.updates).eq("id", action.client_id).eq("trainer_id", trainerId);
      if (error) throw error;
      return `تم تعديل بيانات ${action.client_name} ✅`;
    }
    case "update_nutrition": {
      const { error } = await supabase.from("meal_items").update(action.updates).eq("id", action.item_id);
      if (error) throw error;
      return `تم تعديل "${action.food_name}" في خطة تغذية ${action.client_name} ✅`;
    }
    default:
      throw new Error("عملية غير معروفة");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { messages, confirm_action, action_log_id } = body;

    // Handle confirmed action execution
    if (confirm_action) {
      try {
        // Rate limit check: max 50 actions per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("copilot_action_logs")
          .select("id", { count: "exact", head: true })
          .eq("trainer_id", user.id)
          .eq("confirmed_by_trainer", true)
          .gte("created_at", today.toISOString());

        if ((count || 0) >= 50) {
          return new Response(JSON.stringify({ error: "وصلت الحد اليومي (50 إجراء). حاول غداً." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await executeConfirmedAction(confirm_action, user.id, supabase);

        // Log the action
        await supabase.from("copilot_action_logs" as any).insert({
          trainer_id: user.id,
          action_type: confirm_action.action,
          affected_resource: confirm_action.action,
          affected_resource_id: confirm_action.exercise_id || confirm_action.client_id || confirm_action.item_id || null,
          before_state: body.before_state || {},
          after_state: confirm_action.updates || {},
          confirmed_by_trainer: true,
        });

        return new Response(JSON.stringify({ success: true, message: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message || "فشل تنفيذ العملية" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle undo action
    if (body.undo_action && action_log_id) {
      try {
        const { data: log } = await supabase
          .from("copilot_action_logs" as any)
          .select("*")
          .eq("id", action_log_id)
          .eq("trainer_id", user.id)
          .maybeSingle();

        if (!log) {
          return new Response(JSON.stringify({ error: "لم أجد السجل" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Restore before_state based on action_type
        const beforeState = (log as any).before_state || {};
        const resourceId = (log as any).affected_resource_id;

        if ((log as any).action_type === "update_exercise" && resourceId) {
          await supabase.from("program_exercises").update(beforeState).eq("id", resourceId);
        } else if ((log as any).action_type === "update_client_info" && resourceId) {
          await supabase.from("clients").update(beforeState).eq("id", resourceId).eq("trainer_id", user.id);
        } else if ((log as any).action_type === "update_nutrition" && resourceId) {
          await supabase.from("meal_items").update(beforeState).eq("id", resourceId);
        } else if ((log as any).action_type === "add_exercise" && resourceId) {
          await supabase.from("program_exercises").delete().eq("id", resourceId);
        } else if ((log as any).action_type === "remove_exercise" && resourceId && Object.keys(beforeState).length > 0) {
          await supabase.from("program_exercises").insert({ id: resourceId, ...beforeState });
        } else if ((log as any).action_type === "add_calendar_session" && resourceId) {
          await supabase.from("trainer_sessions").delete().eq("id", resourceId).eq("trainer_id", user.id);
        }

        await supabase.from("copilot_action_logs" as any).update({ undone: true }).eq("id", action_log_id);

        return new Response(JSON.stringify({ success: true, message: "تم التراجع عن العملية ↩️" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message || "فشل التراجع" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Normal chat flow with tool calling
    if (!messages || !Array.isArray(messages)) throw new Error("messages array is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch basic client context for system prompt
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, goal, weight, height, age, experience, week_number, last_workout_date, subscription_end_date, days_per_week, injuries, program_id, subscription_price, billing_cycle")
      .eq("trainer_id", user.id)
      .order("name")
      .limit(200);

    const now = new Date();
    const totalClients = (clients || []).length;
    const activeClients = (clients || []).filter((c: any) => {
      const d = c.last_workout_date ? Math.floor((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000) : 999;
      return d <= 7;
    }).length;

    const clientNames = (clients || []).map((c: any) => {
      const daysInactive = c.last_workout_date ? Math.floor((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000) : null;
      const subEnd = c.subscription_end_date ? new Date(c.subscription_end_date) : null;
      const daysUntilExpiry = subEnd ? Math.ceil((subEnd.getTime() - now.getTime()) / 86400000) : null;
      return `- ${c.name}: هدف=${c.goal || "—"}, وزن=${c.weight || "؟"}كجم, آخر تمرين=${daysInactive !== null ? `قبل ${daysInactive} يوم` : "—"}${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? ` [ينتهي خلال ${daysUntilExpiry} يوم]` : ""}`;
    }).join("\n");

    const systemPrompt = `أنت وكيل ذكي (AI Agent) متخصص في اللياقة البدنية تعمل مع مدرب شخصي في السعودية.

ملخص: ${totalClients} عميل، ${activeClients} نشط هذا الأسبوع.

العملاء:
${clientNames || "لا يوجد عملاء"}

لديك أدوات (tools) لتنفيذ إجراءات حقيقية على بيانات المدرب:
- get_my_clients: عرض جميع العملاء
- get_client_program: عرض برنامج عميل معين
- update_exercise: تعديل تمرين (مجموعات/تكرارات/أوزان)
- add_exercise: إضافة تمرين جديد
- remove_exercise: حذف تمرين
- add_calendar_session: إضافة جلسة للتقويم
- update_client_info: تعديل بيانات عميل
- update_nutrition: تعديل خطة تغذية

قواعد أمان صارمة:
- أنت تعمل فقط مع بيانات هذا المدرب
- لا يمكنك الوصول لبيانات مدربين آخرين
- لا يمكنك تعديل بيانات الدفع أو كلمات المرور
- استخدم الأدوات عندما يطلب المدرب تنفيذ إجراء

قواعد عامة:
- أجب بالعربية دائماً
- عند تنفيذ أي إجراء كتابة، استخدم الأداة المناسبة
- للاستفسارات العامة، أجب مباشرة من السياق
- كن دقيقاً ومحدداً
- إذا طُلب منك شيء خارج صلاحياتك، اعتذر وأوضح السبب`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: TOOLS,
        stream: false, // Non-streaming for tool calls
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد غير كافٍ" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];

    if (!choice) throw new Error("Empty AI response");

    // Check if AI wants to call a tool
    if (choice.finish_reason === "tool_calls" || choice.message?.tool_calls?.length > 0) {
      const toolCalls = choice.message.tool_calls;
      const toolResults: any[] = [];

      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        let fnArgs = {};
        try { fnArgs = JSON.parse(tc.function.arguments || "{}"); } catch {}

        const toolResult = await executeTool(fnName, fnArgs, user.id, supabase);

        if (toolResult.needsConfirmation) {
          // Return pending action for client-side confirmation
          return new Response(JSON.stringify({
            type: "pending_action",
            message: choice.message?.content || "",
            confirmation: toolResult.confirmationMessage,
            action: toolResult.result,
            actionLog: toolResult.actionLog,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        toolResults.push({
          tool_call_id: tc.id,
          role: "tool",
          content: JSON.stringify(toolResult.result),
        });
      }

      // Get final response with tool results
      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            choice.message,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!followUp.ok) throw new Error("AI follow-up failed");

      return new Response(followUp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool call — stream regular response
    // Re-fetch with streaming since we got non-streamed response
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!streamResponse.ok) throw new Error("Stream error");

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("copilot-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
