import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
const cors = require("cors")({ origin: true });

admin.initializeApp();

const firestore = admin.firestore();
const tmdbApiKey = "fb2683306562c11cd4066cfb35a00c8c";

interface Movie {
  id: number;
  vote_average: number;
  title: string;
  adult: boolean;
  backdrop_path: string;
  genre_ids: Array<number>;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: Date;
  video: boolean;
  vote_count: number;
}

async function getMoviesByGenre(genreId: number): Promise<Movie[]> {
  const url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=1000`;

  try {
    const response = await axios.get(url);
    const movies = response.data.results;

    return movies.map((movie: any) => movie);
  } catch (error) {
    console.error("Error al obtener las películas por género:", error);
    throw error;
  }
}

export const generateMovieSuggestions = functions.https.onRequest(
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const userId: string = req.query.userId as string;
        const user = await firestore.collection("users").doc(userId).get();
        const moviesRef = firestore.collection("movies");
        const snapshot = await moviesRef.where("user", "==", user.ref).get();

        const genreIds: number[] = [];
        snapshot.forEach((doc) => {
          const movieData = doc.data();
          const movie: Movie = movieData.movie;

          movie.genre_ids.map((genre) => {
            genreIds.push(genre);
          });
        });

        const favorites_genres = Array.from(genreIds);

        const suggestions: Movie[] = [];

        for (const genreId of favorites_genres) {
          const movies = await getMoviesByGenre(genreId);
          movies.sort((a, b) => b.vote_average - a.vote_average);

          suggestions.push(...movies.slice(0, 2));
        }

        res.status(200).json({ totalItems: suggestions.length, suggestions });
      } catch (error) {
        console.error("Error al generar las sugerencias de películas:", error);
        res.status(500).send("Error al generar las sugerencias de películas");
      }
    });
  }
);
