import React, { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../utils/client"
import { useGetCategoriesQuery } from "../store/reducers/tierSlice"
interface Template {
  name: string
  image: string
  category: string
  slug: string
}

const Templates = () => {
  const { data, error, isLoading } = useGetCategoriesQuery()
  console.log(data)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[] | null | undefined>()
  const { slug } = useParams()

  const getTemplates = async () => {
    setLoading(true)
    let { data: templates, error } = await supabase
      .from("templates")
      .select("*")
      .eq("category", `${slug}`)
    setTemplates(templates)
    setLoading(false)
  }

  useEffect(() => {
    getTemplates()
  }, [])

  return (
    <div className="flex flex-col space-y-5 justify-center items-start">
      <span className="font-bold text-4xl">
        Cars & Racing Tier List Templates
      </span>
      <div className="flex justify-center items-center space-x-2">
        <button className="bg-zinc-800 hover:bg-zinc-700 duration-200 rounded-md text-slate-200 px-2 py-1">
          Recent Cars & Racing Tier Lists
        </button>
        <button className="bg-indigo-800 hover:bg-indigo-700 duration-200 rounded-md text-slate-200 px-2 py-1">
          Create a tier from this template
        </button>
      </div>

      <span>A collection of cars and racing tier list templates.</span>
      {loading ? (
        <div>Loading</div>
      ) : (
        <div>
          {templates?.length! > 0 ? (
            <div className="flex flex-wrap justify-center items-center m-1">
              {templates?.map((template, index) => (
                <Link
                  key={template.slug}
                  to={`/create/${template.slug}-${index}`}
                  className="flex justify-center items-center m-1 flex-col"
                >
                  <img
                    className="object-cover w-36 h-36"
                    key={index}
                    src={template.image}
                  />
                  <span className="bg-black text-white w-36 text-center">
                    {template.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div>No Template exist , Create one</div>
          )}
        </div>
      )}
    </div>
  )
}

export default Templates
