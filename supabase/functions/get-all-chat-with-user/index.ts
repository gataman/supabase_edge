
import * as postgres from 'postgres'
import { serve } from 'std/server'
import { corsHeaders } from '../_shared/cors.ts'

// Get the connection string from the environment variable "SUPABASE_DB_URL"
const databaseUrl = Deno.env.get('DATABASE_URL')!

// Create a database pool with three connections that are lazily established
const pool = new postgres.Pool(databaseUrl, 3, true)


serve(async (_req) => {
  try {
    // Grab a connection from the pool
    const { id } = await _req.json()
    const connection = await pool.connect()

    try {
      // Run a query
      const result = await connection.queryObject`
      SELECT 
        uc.chat_id,
        uc.last_msg_id as last_msg_id,
        uc2.user_id as user_id,
        us.name as name,
        us.surname as surname,
        us.photo_url as photo_url,
        msg.message as message
      

      FROM 
        user_chats as uc
        inner join user_chats as uc2 on uc.chat_id = uc2.chat_id and uc.user_id != uc2.user_id
        inner join users as us on us.id = uc2.user_id 
        inner join messages as msg on msg.id = uc.last_msg_id
      
      WHERE 
        uc.user_id = ${id}`
      const users = result.rows // [{ id: 1, name: "Lion" }, ...]


      // Encode the result as pretty printed JSON
      const body = JSON.stringify(
        users,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      )
      // Return the response with the correct content type header
      return new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8',
        },
      })
    } finally {
      // Release the connection back into the pool
      connection.release()
    }
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 